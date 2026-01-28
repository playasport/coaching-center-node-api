import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { SportModel } from '../../models/sport.model';
import { ReelModel } from '../../models/reel.model';
import { StreamHighlightModel } from '../../models/streamHighlight.model';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
// Distance calculation is done inline using Haversine formula

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (R * c) / 1000; // Distance in km
};

/**
 * MongoDB Fallback Search Service
 * Provides same response format as Meilisearch when Meilisearch is disabled
 */
class MongodbFallbackService {
  /**
   * Search Coaching Centers from MongoDB
   */
  async searchCoachingCenters(
    query: string,
    options: {
      size?: number;
      from?: number;
      latitude?: number | null;
      longitude?: number | null;
      radius?: number;
    } = {}
  ): Promise<any> {
    const { size = 10, from = 0, latitude: userLatitude, longitude: userLongitude } = options;

    try {
      // Build search query
      const searchRegex = new RegExp(query, 'i');
      const mongoQuery: any = {
        is_deleted: false,
        approval_status: 'approved',
        is_active: true,
        $or: [
          { center_name: searchRegex },
          { 'location.address': searchRegex },
          { 'location.city_name': searchRegex },
          { 'location.state_name': searchRegex },
        ],
      };

      // Fetch all matching centers
      let centers = await CoachingCenterModel.find(mongoQuery)
        .populate('sports', 'name custom_id')
        .populate('facility', 'name')
        .lean();

      // Transform to match Meilisearch format
      const transformed = centers.map((center: any) => {
        const location = center.location || {};
        const sports = center.sports || [];
        const sportDetails = center.sport_details || [];
        const facilities = center.facility || [];

        const sportsNames: string[] = [];
        if (Array.isArray(sports)) {
          sports.forEach((sport: any) => {
            if (typeof sport === 'object' && sport.name) {
              sportsNames.push(sport.name);
            }
          });
        }

        const facilityNames: string[] = [];
        if (Array.isArray(facilities)) {
          facilities.forEach((facility: any) => {
            if (typeof facility === 'object' && facility.name) {
              facilityNames.push(facility.name);
            }
          });
        }

        const sportsIds: string[] = [];
        if (Array.isArray(sports)) {
          sports.forEach((sport: any) => {
            if (typeof sport === 'object' && sport._id) {
              sportsIds.push(sport._id.toString());
            } else if (sport instanceof Types.ObjectId) {
              sportsIds.push(sport.toString());
            }
          });
        }

        // Get images from sport_details - prioritize is_banner, limit to 2
        // If no images available, use logo as fallback
        const allImages: any[] = [];
        const logoUrl = center.logo || null;
        
        if (Array.isArray(sportDetails)) {
          sportDetails.forEach((detail: any) => {
            if (Array.isArray(detail.images)) {
              // Filter active, non-deleted images and exclude logo if it matches
              const validImages = detail.images.filter((img: any) => {
                if (typeof img === 'string') {
                  // Exclude if it matches the logo URL
                  return logoUrl ? img !== logoUrl : true;
                }
                const isActive = img.is_active !== false && img.is_deleted !== true && !img.deletedAt;
                if (!isActive) return false;
                // Exclude if image URL matches logo URL
                const imgUrl = img.url || '';
                return logoUrl ? imgUrl !== logoUrl : true;
              });
              allImages.push(...validImages);
            }
          });
        }

        // Sort: is_banner=true first, then others, then take only 2
        allImages.sort((a: any, b: any) => {
          const aIsBanner = typeof a === 'object' && a.is_banner === true ? 1 : 0;
          const bIsBanner = typeof b === 'object' && b.is_banner === true ? 1 : 0;
          return bIsBanner - aIsBanner; // Banner images first
        });

        // Take only 2 images and convert to URL strings
        let images: string[] = allImages.slice(0, 2).map((img: any) => {
          if (typeof img === 'string') return img;
          return img.url || '';
        }).filter((url: string) => url && url.trim() !== '');

        // If no images found and logo exists, use logo as fallback
        if (images.length === 0 && logoUrl) {
          images = [logoUrl];
        }

        const latitude = location.latitude || location.lat || null;
        const longitude = location.longitude || location.long || null;

        // Calculate distance if location provided
        let distance: number | null = null;
        if (latitude && longitude && userLatitude && userLongitude) {
          distance = calculateDistanceKm(
            userLatitude,
            userLongitude,
            latitude,
            longitude
          );
        }

        // Check if query matches sports
        const queryLower = query.toLowerCase().trim();
        const isSportMatch = sportsNames.some((sport) =>
          sport.toLowerCase().includes(queryLower)
        );

        return {
          id: center.id || center._id?.toString(),
          name: center.center_name || '',
          coaching_name: center.center_name || '',
          description: sportDetails
            .map((d: any) => d.description || '')
            .filter((d: string) => d)
            .join(' ') || '',
          address: location.address || '',
          latitude,
          longitude,
          logo: center.logo || null,
          images,
          allowed_gender: center.allowed_genders || [],
          sports_names: sportsNames,
          location_name: location.location_name || '',
          experience: center.experience || 0,
          pincode: location.pincode || null,
          distance: distance !== null ? Math.round(distance * 100) / 100 : null,
          _isSportMatch: isSportMatch,
          _priority: isSportMatch ? 1 : 2,
        };
      });

      // No radius filtering - return all matching results
      // Sort: sport matches first, then by distance (if location provided)
      transformed.sort((a: any, b: any) => {
        if (a._priority !== b._priority) {
          return a._priority - b._priority;
        }
        // Sort by distance if both have distance values
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        // Items with distance come before items without distance
        if (a.distance !== null && b.distance === null) {
          return -1;
        }
        if (a.distance === null && b.distance !== null) {
          return 1;
        }
        return 0;
      });

      // Paginate
      const paginated = transformed.slice(from, from + size);

      return {
        hits: paginated,
        estimatedTotalHits: transformed.length,
        processingTimeMs: 0,
      };
    } catch (error) {
      logger.error('MongoDB fallback search coaching centers error:', error);
      return {
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 0,
      };
    }
  }

  /**
   * Search Sports from MongoDB
   */
  async searchSports(
    query: string,
    options: { size?: number; from?: number } = {}
  ): Promise<any> {
    const { size = 10, from = 0 } = options;

    try {
      const searchRegex = new RegExp(query, 'i');
      const mongoQuery: any = {
        is_active: true,
        $or: [{ name: searchRegex }],
      };

      const sports = await SportModel.find(mongoQuery)
        .sort({ name: 1 })
        .limit(size + from)
        .lean();

      const transformed = sports.slice(from).map((sport: any) => ({
        id: sport.custom_id || sport._id?.toString(),
        name: sport.name || '',
        title: sport.name || '',
        sport_id: sport.custom_id || sport._id?.toString(),
        sport_name: sport.name || '',
        sport_logo: sport.logo || null,
        logo: sport.logo || null,
        images: sport.images || [],
        videos: sport.videos || [],
        description: sport.description || sport.bio || '',
        bio: sport.description || sport.bio || '',
        has_sport_bio: !!(sport.description || sport.bio),
        is_active: sport.is_active !== false,
        is_popular: sport.is_popular || false,
      }));

      return {
        hits: transformed,
        estimatedTotalHits: sports.length,
        processingTimeMs: 0,
      };
    } catch (error) {
      logger.error('MongoDB fallback search sports error:', error);
      return {
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 0,
      };
    }
  }

  /**
   * Search Reels from MongoDB
   */
  async searchReels(
    query: string,
    options: { size?: number; from?: number } = {}
  ): Promise<any> {
    const { size = 10, from = 0 } = options;

    try {
      const searchRegex = new RegExp(query, 'i');
      const mongoQuery: any = {
        deletedAt: null,
        status: 'approved',
        $or: [{ title: searchRegex }, { description: searchRegex }],
      };

      const reels = await ReelModel.find(mongoQuery)
        .sort({ viewsCount: -1, createdAt: -1 })
        .limit(size + from)
        .lean();

      const transformed = reels.slice(from).map((reel: any) => ({
        id: reel.id || reel._id?.toString(),
        name: reel.title || '',
        title: reel.title || '',
        description: reel.description || '',
        thumbnail: reel.thumbnailPath || null,
        thumbnailUrl: reel.thumbnailPath || null,
        video_url: reel.previewUrl || reel.masterM3u8Url || reel.originalPath || null,
        videoUrl: reel.previewUrl || reel.masterM3u8Url || reel.originalPath || null,
        views: reel.viewsCount || 0,
        views_count: reel.viewsCount || 0,
        likes: reel.likesCount || 0,
        likes_count: reel.likesCount || 0,
        comments: reel.commentsCount || 0,
        comments_count: reel.commentsCount || 0,
        status: reel.status || 'approved',
      }));

      return {
        hits: transformed,
        estimatedTotalHits: reels.length,
        processingTimeMs: 0,
      };
    } catch (error) {
      logger.error('MongoDB fallback search reels error:', error);
      return {
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 0,
      };
    }
  }

  /**
   * Search Stream Highlights from MongoDB
   */
  async searchStreamHighlights(
    query: string,
    options: { size?: number; from?: number } = {}
  ): Promise<any> {
    const { size = 10, from = 0 } = options;

    try {
      const searchRegex = new RegExp(query, 'i');
      const mongoQuery: any = {
        deletedAt: null,
        status: 'published',
        $or: [{ title: searchRegex }, { description: searchRegex }],
      };

      const highlights = await StreamHighlightModel.find(mongoQuery)
        .sort({ viewsCount: -1, createdAt: -1 })
        .limit(size + from)
        .lean();

      const transformed = highlights.slice(from).map((highlight: any) => ({
        id: highlight.id || highlight._id?.toString(),
        name: highlight.title || '',
        title: highlight.title || '',
        description: highlight.description || '',
        thumbnail: highlight.thumbnailUrl || null,
        thumbnailUrl: highlight.thumbnailUrl || null,
        video_url: highlight.videoUrl || highlight.previewUrl || highlight.masterM3u8Url || null,
        videoUrl: highlight.videoUrl || highlight.previewUrl || highlight.masterM3u8Url || null,
        stream_key: highlight.streamSessionId?.toString() || null,
        views: highlight.viewsCount || 0,
        views_count: highlight.viewsCount || 0,
        likes: highlight.likesCount || 0,
        likes_count: highlight.likesCount || 0,
        comments: highlight.commentsCount || 0,
        comments_count: highlight.commentsCount || 0,
        status: highlight.status || 'published',
        duration: highlight.duration || 0,
      }));

      return {
        hits: transformed,
        estimatedTotalHits: highlights.length,
        processingTimeMs: 0,
      };
    } catch (error) {
      logger.error('MongoDB fallback search stream highlights error:', error);
      return {
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 0,
      };
    }
  }
}

export const mongodbFallback = new MongodbFallbackService();
