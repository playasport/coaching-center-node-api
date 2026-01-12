import { meilisearchClient } from './meilisearch.client';
import { logger } from '../../utils/logger';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { SportModel } from '../../models/sport.model';
import { ReelModel } from '../../models/reel.model';
import { StreamHighlightModel } from '../../models/streamHighlight.model';
import mongoose from 'mongoose';

/**
 * Meilisearch Index Names
 */
export const MEILISEARCH_INDICES = {
  SPORTS: 'sports_index',
  COACHING_CENTRES: 'coaching_centres_index',
  REELS: 'reels_index',
  LIVE_STREAMS: 'live_streams_index', // For highlights/streams
} as const;

/**
 * Indexing Service for Meilisearch
 * Handles indexing of all models
 */
class MeilisearchIndexingService {
  /**
   * Check if indexing is enabled
   */
  private isIndexingEnabled(): boolean {
    return meilisearchClient.isEnabled();
  }

  /**
   * Index a single document
   */
  private async indexDocument(
    indexName: string,
    document: any,
    primaryKey: string = 'id'
  ): Promise<boolean> {
    if (!this.isIndexingEnabled()) {
      return false;
    }

    const client = meilisearchClient.getClient();
    if (!client) {
      return false;
    }

    try {
      const index = client.index(indexName);
      await index.addDocuments([document], { primaryKey });
      return true;
    } catch (error) {
      logger.error(`Failed to index document in ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Update a single document
   */
  private async updateDocument(
    indexName: string,
    document: any,
    primaryKey: string = 'id'
  ): Promise<boolean> {
    if (!this.isIndexingEnabled()) {
      return false;
    }

    const client = meilisearchClient.getClient();
    if (!client) {
      return false;
    }

    try {
      const index = client.index(indexName);
      await index.updateDocuments([document], { primaryKey });
      return true;
    } catch (error) {
      logger.error(`Failed to update document in ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Delete a document
   */
  private async deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<boolean> {
    if (!this.isIndexingEnabled()) {
      return false;
    }

    const client = meilisearchClient.getClient();
    if (!client) {
      return false;
    }

    try {
      const index = client.index(indexName);
      await index.deleteDocument(documentId);
      return true;
    } catch (error) {
      logger.error(`Failed to delete document from ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Transform Coaching Center to Meilisearch document
   */
  private transformCoachingCenter(center: any): any {
    const location = center.location || {};
    const sports = center.sports || [];
    const sportDetails = center.sport_details || [];
    const facilities = center.facility || [];

    // Get sports names from populated sports or sport_details
    const sportsNames: string[] = [];
    if (Array.isArray(sports)) {
      sports.forEach((sport: any) => {
        if (typeof sport === 'object' && sport.name) {
          sportsNames.push(sport.name);
        } else if (typeof sport === 'string') {
          sportsNames.push(sport);
        }
      });
    }

    // Get facility names
    const facilityNames: string[] = [];
    if (Array.isArray(facilities)) {
      facilities.forEach((facility: any) => {
        if (typeof facility === 'object' && facility.name) {
          facilityNames.push(facility.name);
        } else if (typeof facility === 'string') {
          facilityNames.push(facility);
        }
      });
    }

    // Get sports IDs
    const sportsIds: string[] = [];
    if (Array.isArray(sports)) {
      sports.forEach((sport: any) => {
        if (typeof sport === 'object' && sport._id) {
          sportsIds.push(sport._id.toString());
        } else if (sport instanceof mongoose.Types.ObjectId) {
          sportsIds.push(sport.toString());
        }
      });
    }

    // Get facility IDs
    const facilityIds: string[] = [];
    if (Array.isArray(facilities)) {
      facilities.forEach((facility: any) => {
        if (typeof facility === 'object' && facility._id) {
          facilityIds.push(facility._id.toString());
        } else if (facility instanceof mongoose.Types.ObjectId) {
          facilityIds.push(facility.toString());
        }
      });
    }

    // Get images from sport_details - prioritize is_banner, limit to 2
    const allImages: any[] = [];
    if (Array.isArray(sportDetails)) {
      sportDetails.forEach((detail: any) => {
        if (Array.isArray(detail.images)) {
          // Filter active, non-deleted images
          const validImages = detail.images.filter((img: any) => {
            if (typeof img === 'string') return true; // Simple URL string
            return img.is_active !== false && img.is_deleted !== true && !img.deletedAt;
          });
          allImages.push(...validImages);
        }
      });
    }
    if (center.logo) {
      // Add logo as first image (as string URL)
      allImages.unshift(center.logo);
    }

    // Sort: is_banner=true first, then others, then take only 2
    allImages.sort((a: any, b: any) => {
      const aIsBanner = typeof a === 'object' && a.is_banner === true ? 1 : 0;
      const bIsBanner = typeof b === 'object' && b.is_banner === true ? 1 : 0;
      return bIsBanner - aIsBanner; // Banner images first
    });

    // Take only 2 images and convert to URL strings
    const images: string[] = allImages.slice(0, 2).map((img: any) => {
      if (typeof img === 'string') return img;
      return img.url || '';
    }).filter((url: string) => url && url.trim() !== '');

    const latitude = location.latitude || location.lat || null;
    const longitude = location.longitude || location.long || null;

    return {
      id: center.id || center._id?.toString(),
      name: center.center_name || '',
      coaching_name: center.center_name || '',
      description: sportDetails
        .map((d: any) => d.description || '')
        .filter((d: string) => d)
        .join(' ') || '',
      bio: sportDetails
        .map((d: any) => d.description || '')
        .filter((d: string) => d)
        .join(' ') || '',
      address: location.address || '',
      address_line1: location.address_line1 || '',
      address_line2: location.address_line2 || '',
      latitude: latitude,
      longitude: longitude,
      lat: latitude,
      long: longitude,
      _geo: latitude && longitude ? { lat: latitude, lng: longitude } : null,
      logo: center.logo || null,
      images: images,
      allowed_gender: center.allowed_genders || [],
      sports_names: sportsNames,
      location_name: location.location_name || '',
      experience: center.experience || 0,
      pincode: location.pincode || null,
      is_active: center.is_active !== false,
      is_admin_approve: center.approval_status === 'approved',
      approval_status: center.approval_status || 'pending_approval',
      created_at: center.createdAt || new Date(),
      updated_at: center.updatedAt || new Date(),
    };
  }

  /**
   * Transform Sport to Meilisearch document
   */
  private transformSport(sport: any): any {
    return {
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
      created_at: sport.createdAt || new Date(),
      updated_at: sport.updatedAt || new Date(),
    };
  }

  /**
   * Transform Reel to Meilisearch document
   */
  private transformReel(reel: any): any {
    return {
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
      status: reel.status || 'published',
      created_at: reel.createdAt || new Date(),
      updated_at: reel.updatedAt || new Date(),
    };
  }

  /**
   * Transform Stream Highlight to Meilisearch document
   */
  private transformStreamHighlight(highlight: any): any {
    return {
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
      created_at: highlight.createdAt || new Date(),
      updated_at: highlight.updatedAt || new Date(),
    };
  }

  /**
   * Index Coaching Center
   */
  public async indexCoachingCenter(centerId: string): Promise<boolean> {
    try {
      const center = await CoachingCenterModel.findOne({
        $or: [{ id: centerId }, { _id: centerId }],
        is_deleted: false,
      })
        .populate('sports', 'name custom_id')
        .populate('facility', 'name')
        .lean();

      if (!center) {
        logger.warn(`Coaching center not found: ${centerId}`);
        return false;
      }

      // Only index approved and active centers
      if (center.approval_status !== 'approved' || !center.is_active) {
        // Delete from index if exists
        await this.deleteCoachingCenter(centerId);
        return false;
      }

      const document = this.transformCoachingCenter(center);
      return await this.indexDocument(MEILISEARCH_INDICES.COACHING_CENTRES, document);
    } catch (error) {
      logger.error(`Failed to index coaching center ${centerId}:`, error);
      return false;
    }
  }

  /**
   * Update Coaching Center in index
   */
  public async updateCoachingCenter(centerId: string): Promise<boolean> {
    return await this.indexCoachingCenter(centerId);
  }

  /**
   * Delete Coaching Center from index
   */
  public async deleteCoachingCenter(centerId: string): Promise<boolean> {
    return await this.deleteDocument(MEILISEARCH_INDICES.COACHING_CENTRES, centerId);
  }

  /**
   * Index Sport
   */
  public async indexSport(sportId: string): Promise<boolean> {
    try {
      const sport = await SportModel.findOne({
        $or: [{ custom_id: sportId }, { _id: sportId }],
      }).lean();

      if (!sport) {
        logger.warn(`Sport not found: ${sportId}`);
        return false;
      }

      // Only index active sports
      if (!sport.is_active) {
        await this.deleteSport(sportId);
        return false;
      }

      const document = this.transformSport(sport);
      return await this.indexDocument(MEILISEARCH_INDICES.SPORTS, document, 'id');
    } catch (error) {
      logger.error(`Failed to index sport ${sportId}:`, error);
      return false;
    }
  }

  /**
   * Update Sport in index
   */
  public async updateSport(sportId: string): Promise<boolean> {
    return await this.indexSport(sportId);
  }

  /**
   * Delete Sport from index
   */
  public async deleteSport(sportId: string): Promise<boolean> {
    return await this.deleteDocument(MEILISEARCH_INDICES.SPORTS, sportId);
  }

  /**
   * Index Reel
   */
  public async indexReel(reelId: string): Promise<boolean> {
    try {
      const reel = await ReelModel.findOne({
        $or: [{ id: reelId }, { _id: reelId }],
        deletedAt: null,
      }).lean();

      if (!reel) {
        logger.warn(`Reel not found: ${reelId}`);
        return false;
      }

      // Only index approved reels (status must be 'approved')
      if (reel.status !== 'approved') {
        await this.deleteReel(reelId);
        return false;
      }

      const document = this.transformReel(reel);
      return await this.indexDocument(MEILISEARCH_INDICES.REELS, document);
    } catch (error) {
      logger.error(`Failed to index reel ${reelId}:`, error);
      return false;
    }
  }

  /**
   * Update Reel in index
   */
  public async updateReel(reelId: string): Promise<boolean> {
    return await this.indexReel(reelId);
  }

  /**
   * Delete Reel from index
   */
  public async deleteReel(reelId: string): Promise<boolean> {
    return await this.deleteDocument(MEILISEARCH_INDICES.REELS, reelId);
  }

  /**
   * Index Stream Highlight
   */
  public async indexStreamHighlight(highlightId: string): Promise<boolean> {
    try {
      const highlight = await StreamHighlightModel.findOne({
        $or: [{ id: highlightId }, { _id: highlightId }],
        deletedAt: null,
      }).lean();

      if (!highlight) {
        logger.warn(`Stream highlight not found: ${highlightId}`);
        return false;
      }

      // Only index published highlights
      if (highlight.status !== 'published') {
        await this.deleteStreamHighlight(highlightId);
        return false;
      }

      const document = this.transformStreamHighlight(highlight);
      return await this.indexDocument(MEILISEARCH_INDICES.LIVE_STREAMS, document);
    } catch (error) {
      logger.error(`Failed to index stream highlight ${highlightId}:`, error);
      return false;
    }
  }

  /**
   * Update Stream Highlight in index
   */
  public async updateStreamHighlight(highlightId: string): Promise<boolean> {
    return await this.indexStreamHighlight(highlightId);
  }

  /**
   * Delete Stream Highlight from index
   */
  public async deleteStreamHighlight(highlightId: string): Promise<boolean> {
    return await this.deleteDocument(MEILISEARCH_INDICES.LIVE_STREAMS, highlightId);
  }

  /**
   * Re-index all coaching centers
   */
  public async reindexAllCoachingCenters(): Promise<{ success: number; failed: number }> {
    if (!this.isIndexingEnabled()) {
      logger.info('Meilisearch indexing is disabled');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    try {
      const centers = await CoachingCenterModel.find({
        is_deleted: false,
        approval_status: 'approved',
        is_active: true,
      })
        .populate('sports', 'name custom_id')
        .populate('facility', 'name')
        .lean();

      const client = meilisearchClient.getClient();
      if (!client) {
        throw new Error('Meilisearch client not available');
      }

      const index = client.index(MEILISEARCH_INDICES.COACHING_CENTRES);
      const documents = centers.map((center) => this.transformCoachingCenter(center));
      
      if (documents.length > 0) {
        await index.addDocuments(documents, { primaryKey: 'id' });
        success = documents.length;
        logger.info(`Re-indexed ${success} coaching centers`);
      }
    } catch (error) {
      logger.error('Failed to re-index coaching centers:', error);
      failed = 1;
    }

    return { success, failed };
  }

  /**
   * Re-index all sports
   */
  public async reindexAllSports(): Promise<{ success: number; failed: number }> {
    if (!this.isIndexingEnabled()) {
      logger.info('Meilisearch indexing is disabled');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    try {
      const sports = await SportModel.find({ is_active: true }).lean();

      const client = meilisearchClient.getClient();
      if (!client) {
        throw new Error('Meilisearch client not available');
      }

      const index = client.index(MEILISEARCH_INDICES.SPORTS);
      const documents = sports.map((sport) => this.transformSport(sport));
      
      if (documents.length > 0) {
        await index.addDocuments(documents, { primaryKey: 'id' });
        success = documents.length;
        logger.info(`Re-indexed ${success} sports`);
      }
    } catch (error) {
      logger.error('Failed to re-index sports:', error);
      failed = 1;
    }

    return { success, failed };
  }

  /**
   * Re-index all reels
   */
  public async reindexAllReels(): Promise<{ success: number; failed: number }> {
    if (!this.isIndexingEnabled()) {
      logger.info('Meilisearch indexing is disabled');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    try {
      const reels = await ReelModel.find({
        deletedAt: null,
        status: 'approved', // Only index approved reels
      }).lean();

      const client = meilisearchClient.getClient();
      if (!client) {
        throw new Error('Meilisearch client not available');
      }

      const index = client.index(MEILISEARCH_INDICES.REELS);
      const documents = reels.map((reel) => this.transformReel(reel));
      
      if (documents.length > 0) {
        await index.addDocuments(documents, { primaryKey: 'id' });
        success = documents.length;
        logger.info(`Re-indexed ${success} reels`);
      }
    } catch (error) {
      logger.error('Failed to re-index reels:', error);
      failed = 1;
    }

    return { success, failed };
  }

  /**
   * Re-index all stream highlights
   */
  public async reindexAllStreamHighlights(): Promise<{ success: number; failed: number }> {
    if (!this.isIndexingEnabled()) {
      logger.info('Meilisearch indexing is disabled');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    try {
      const highlights = await StreamHighlightModel.find({
        deletedAt: null,
        status: 'published',
      }).lean();

      const client = meilisearchClient.getClient();
      if (!client) {
        throw new Error('Meilisearch client not available');
      }

      const index = client.index(MEILISEARCH_INDICES.LIVE_STREAMS);
      const documents = highlights.map((highlight) => this.transformStreamHighlight(highlight));
      
      if (documents.length > 0) {
        await index.addDocuments(documents, { primaryKey: 'id' });
        success = documents.length;
        logger.info(`Re-indexed ${success} stream highlights`);
      }
    } catch (error) {
      logger.error('Failed to re-index stream highlights:', error);
      failed = 1;
    }

    return { success, failed };
  }

  /**
   * Re-index all indices
   */
  public async reindexAll(): Promise<{
    coaching_centers: { success: number; failed: number };
    sports: { success: number; failed: number };
    reels: { success: number; failed: number };
    stream_highlights: { success: number; failed: number };
  }> {
    logger.info('Starting full re-indexing of all Meilisearch indices...');

    const [coachingCenters, sports, reels, streamHighlights] = await Promise.all([
      this.reindexAllCoachingCenters(),
      this.reindexAllSports(),
      this.reindexAllReels(),
      this.reindexAllStreamHighlights(),
    ]);

    logger.info('Full re-indexing completed');

    return {
      coaching_centers: coachingCenters,
      sports,
      reels,
      stream_highlights: streamHighlights,
    };
  }

  /**
   * Configure index settings (searchable attributes, filterable attributes, etc.)
   */
  public async configureIndices(): Promise<boolean> {
    if (!this.isIndexingEnabled()) {
      return false;
    }

    const client = meilisearchClient.getClient();
    if (!client) {
      return false;
    }

    try {
      // Configure Coaching Centres Index
      const coachingIndex = client.index(MEILISEARCH_INDICES.COACHING_CENTRES);
      await coachingIndex.updateSettings({
        searchableAttributes: [
          'name',
          'coaching_name',
          'description',
          'bio',
          'address',
          'city',
          'city_name',
          'state',
          'state_name',
          'sports_names',
          'facilities',
        ],
        filterableAttributes: [
          'is_active',
          'is_admin_approve',
          'approval_status',
          'city_id',
          'state_id',
          'sports_ids',
          'facility_ids',
        ],
        sortableAttributes: ['rating', 'review_count', 'created_at', 'updated_at'],
        displayedAttributes: [
          'id',
          'name',
          'coaching_name',
          'description',
          'bio',
          'address',
          'city',
          'city_name',
          'city_id',
          'state',
          'state_id',
          'state_name',
          'latitude',
          'longitude',
          'lat',
          'long',
          '_geo',
          'logo',
          'images',
          'rating',
          'average_rating',
          'review_count',
          'allowed_gender',
          'sports',
          'sports_ids',
          'sports_names',
          'facilities',
          'facility_ids',
          'location_name',
          'experience',
          'pincode',
          'created_at',
          'updated_at',
        ],
      });

      // Configure Sports Index
      const sportsIndex = client.index(MEILISEARCH_INDICES.SPORTS);
      await sportsIndex.updateSettings({
        searchableAttributes: ['name', 'title', 'description', 'bio'],
        filterableAttributes: ['is_active', 'is_popular'],
        sortableAttributes: ['name', 'created_at', 'updated_at'],
        displayedAttributes: [
          'id',
          'name',
          'title',
          'sport_id',
          'sport_name',
          'sport_logo',
          'logo',
          'images',
          'videos',
          'description',
          'bio',
          'has_sport_bio',
          'is_active',
          'is_popular',
          'created_at',
          'updated_at',
        ],
      });

      // Configure Reels Index
      const reelsIndex = client.index(MEILISEARCH_INDICES.REELS);
      await reelsIndex.updateSettings({
        searchableAttributes: ['name', 'title', 'description'],
        filterableAttributes: ['status'],
        sortableAttributes: ['views', 'views_count', 'likes', 'likes_count', 'created_at', 'updated_at'],
        displayedAttributes: [
          'id',
          'name',
          'title',
          'description',
          'thumbnail',
          'thumbnailUrl',
          'video_url',
          'videoUrl',
          'views',
          'views_count',
          'likes',
          'likes_count',
          'comments',
          'comments_count',
          'status',
          'created_at',
          'updated_at',
        ],
      });

      // Configure Live Streams Index
      const streamsIndex = client.index(MEILISEARCH_INDICES.LIVE_STREAMS);
      await streamsIndex.updateSettings({
        searchableAttributes: ['name', 'title', 'description'],
        filterableAttributes: ['status'],
        sortableAttributes: ['views', 'views_count', 'likes', 'likes_count', 'created_at', 'updated_at'],
        displayedAttributes: [
          'id',
          'name',
          'title',
          'description',
          'thumbnail',
          'thumbnailUrl',
          'video_url',
          'videoUrl',
          'stream_key',
          'views',
          'views_count',
          'likes',
          'likes_count',
          'comments',
          'comments_count',
          'status',
          'duration',
          'created_at',
          'updated_at',
        ],
      });

      logger.info('Meilisearch indices configured successfully');
      return true;
    } catch (error) {
      logger.error('Failed to configure Meilisearch indices:', error);
      return false;
    }
  }
}

export const meilisearchIndexing = new MeilisearchIndexingService();
