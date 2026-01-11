import { StreamHighlightModel, HighlightStatus } from '../../models/streamHighlight.model';
import { VideoProcessingStatus } from '../../models/streamHighlight.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { Types } from 'mongoose';

export interface HighlightListItem {
  id: string;
  thumbnail: string;
  title: string;
  viewers: number;
  createdAt: Date;
}

export interface HighlightsListResponse {
  highlights: HighlightListItem[];
  total: number;
  current_page: number;
  total_pages: number;
  limit: number;
}

export interface HighlightDetailResponse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  playLink: string;
  views: number;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  sports: {
    id: string;
    name: string;
    logo: string | null;
  }[];
  coachingCenter: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
}

/**
 * Get paginated list of published highlights (minimal data)
 */
export const getHighlightsList = async (
  page: number = 1,
  limit: number = 10
): Promise<HighlightsListResponse> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(limit))); // Max 100 per page

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Build query - only get published, non-deleted highlights with video processing done
    const query = {
      status: HighlightStatus.PUBLISHED,
      videoProcessingStatus: VideoProcessingStatus.COMPLETED,
      deletedAt: null,
    };

    // Get total count
    const total = await StreamHighlightModel.countDocuments(query);

    // Get highlights (minimal data)
    const highlights = await StreamHighlightModel.find(query)
      .select('id thumbnailUrl title viewsCount createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Format highlights for response
    const formattedHighlights: HighlightListItem[] = highlights.map((highlight: any) => ({
      id: highlight.id,
      thumbnail: highlight.thumbnailUrl || '',
      title: highlight.title,
      viewers: highlight.viewsCount || 0,
      createdAt: highlight.createdAt,
    }));

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Highlights list fetched', {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
    });

    return {
      highlights: formattedHighlights,
      total,
      current_page: pageNumber,
      total_pages: totalPages,
      limit: pageSize,
    };
  } catch (error) {
    logger.error('Failed to fetch highlights list:', error);
    throw new ApiError(500, 'Failed to fetch highlights list');
  }
};

/**
 * Get highlight details by ID
 */
export const getHighlightById = async (highlightId: string): Promise<HighlightDetailResponse> => {
  try {
    // Handle both custom id field and MongoDB _id
    const query: any = { 
      deletedAt: null,
      status: HighlightStatus.PUBLISHED,
    };
    
    if (Types.ObjectId.isValid(highlightId) && highlightId.length === 24) {
      // If it's a valid ObjectId, try _id first, then fall back to id
      query.$or = [{ _id: new Types.ObjectId(highlightId) }, { id: highlightId }];
    } else {
      // Otherwise, use the custom id field
      query.id = highlightId;
    }

    // Get highlight with populated references
    const highlight = await StreamHighlightModel.findOne(query)
      .populate('userId', 'id firstName lastName profileImage')
      .populate({
        path: 'coachingCenterId',
        select: 'id center_name logo sports',
        populate: {
          path: 'sports',
          select: 'custom_id name logo',
        },
      })
      .lean();

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    // Format user data
    let userData = null;
    if (highlight.userId) {
      const user = highlight.userId as any;
      userData = {
        id: user._id?.toString() || user.id || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        logo: user.profileImage || null,
      };
    }

    // Format sports data from coaching center
    let sportsData: { id: string; name: string; logo: string | null }[] = [];
    if (highlight.coachingCenterId) {
      const coachingCenter = highlight.coachingCenterId as any;
      if (coachingCenter.sports && Array.isArray(coachingCenter.sports)) {
        sportsData = coachingCenter.sports.map((sport: any) => ({
          id: sport.custom_id || sport._id?.toString() || '',
          name: sport.name || '',
          logo: sport.logo || null,
        }));
      }
    }

    // Format coaching center data
    let coachingCenterData = null;
    if (highlight.coachingCenterId) {
      const coachingCenter = highlight.coachingCenterId as any;
      coachingCenterData = {
        id: coachingCenter._id?.toString() || coachingCenter.id || '',
        name: coachingCenter.center_name || '',
        logo: coachingCenter.logo || null,
      };
    }

    // Use masterM3u8Url if available, otherwise fall back to videoUrl
    const playLink = highlight.masterM3u8Url || highlight.videoUrl || '';

    const formattedHighlight: HighlightDetailResponse = {
      id: highlight.id,
      title: highlight.title,
      description: highlight.description || null,
      thumbnail: highlight.thumbnailUrl || null,
      playLink,
      views: highlight.viewsCount || 0,
      createdAt: highlight.createdAt,
      user: userData,
      sports: sportsData,
      coachingCenter: coachingCenterData,
    };

    logger.info('Highlight details fetched', {
      highlightId: highlight.id,
    });

    return formattedHighlight;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch highlight details:', error);
    throw new ApiError(500, 'Failed to fetch highlight details');
  }
};

/**
 * Update highlight view count (increment viewsCount)
 */
export const updateHighlightView = async (highlightId: string): Promise<number> => {
  try {
    // Handle both custom id field and MongoDB _id
    const query: any = { deletedAt: null };
    if (Types.ObjectId.isValid(highlightId) && highlightId.length === 24) {
      // If it's a valid ObjectId, try _id first, then fall back to id
      query.$or = [{ _id: new Types.ObjectId(highlightId) }, { id: highlightId }];
    } else {
      // Otherwise, use the custom id field
      query.id = highlightId;
    }

    // Use findOneAndUpdate to get the updated document
    const updatedHighlight = await StreamHighlightModel.findOneAndUpdate(
      query,
      { $inc: { viewsCount: 1 } },
      { new: true, select: 'viewsCount' }
    ).lean();
    
    if (!updatedHighlight) {
      logger.warn(`Highlight not found for view tracking: ${highlightId}`);
      return 0;
    }

    const viewCount = updatedHighlight.viewsCount || 0;
    logger.debug(`Highlight view tracked successfully: ${highlightId}, new count: ${viewCount}`);
    return viewCount;
  } catch (error) {
    logger.error('Failed to track highlight view:', error);
    // Return 0 on error - it's not critical
    return 0;
  }
};
