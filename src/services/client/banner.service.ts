import { BannerModel, Banner, BannerPosition, BannerStatus } from '../../models/banner.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { Types } from 'mongoose';

/**
 * Get active banners by position (for public/user API)
 * Returns only active banners that are currently scheduled and match the position
 */
export const getActiveBannersByPosition = async (
  position: BannerPosition,
  options?: {
    sportId?: string;
    centerId?: string;
    limit?: number;
    targetAudience?: string; // For filtering by user type
    academyOnly?: boolean; // If true, include banners with centerIds set (for academy routes)
  }
): Promise<Banner[]> => {
  try {
    const andConditions: any[] = [];

    // Filter by sport if provided
    if (options?.sportId) {
      andConditions.push({
        $or: [
          { sportIds: null },
          { sportIds: { $in: [options.sportId] } },
        ],
      });
    }

    // Filter by center if provided
    if (options?.centerId) {
      andConditions.push({
        $or: [
          { centerIds: null },
          { centerIds: { $in: [options.centerId] } },
        ],
      });
    } else if (!options?.academyOnly) {
      // If centerId is NOT provided and this is NOT an academy route,
      // exclude banners that are marked as academy-only
      // Only show banners that are NOT academy-only
      andConditions.push({
        isOnlyForAcademy: false,
      });
    }

    // Filter by target audience if provided
    if (options?.targetAudience) {
      andConditions.push({
        $or: [
          { targetAudience: 'all' },
          { targetAudience: options.targetAudience },
        ],
      });
    }

    const query: any = {
      position,
      isActive: true,
      status: BannerStatus.ACTIVE,
      deletedAt: null,
      $and: andConditions,
    };

    const limit = options?.limit || 10;

    const banners = await BannerModel.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return banners as Banner[];
  } catch (error) {
    logger.error('Failed to get active banners by position:', error);
    throw new ApiError(500, 'Failed to get active banners');
  }
};

/**
 * Track banner view (increment viewCount)
 */
export const trackBannerView = async (bannerId: string): Promise<void> => {
  try {
    // Handle both custom id field and MongoDB _id
    const query: any = { deletedAt: null };
    if (Types.ObjectId.isValid(bannerId) && bannerId.length === 24) {
      // If it's a valid ObjectId, try _id first, then fall back to id
      query.$or = [{ _id: new Types.ObjectId(bannerId) }, { id: bannerId }];
    } else {
      // Otherwise, use the custom id field
      query.id = bannerId;
    }

    const result = await BannerModel.updateOne(query, { $inc: { viewCount: 1 } });
    
    if (result.matchedCount === 0) {
      logger.warn(`Banner not found for view tracking: ${bannerId}`);
    } else if (result.modifiedCount === 0) {
      logger.warn(`Banner view count not updated (already at limit?): ${bannerId}`);
    } else {
      logger.debug(`Banner view tracked successfully: ${bannerId}`);
    }
  } catch (error) {
    logger.error('Failed to track banner view:', error);
    // Don't throw error for tracking - it's not critical
  }
};

/**
 * Track banner click (increment clickCount)
 */
export const trackBannerClick = async (bannerId: string): Promise<void> => {
  try {
    // Handle both custom id field and MongoDB _id
    const query: any = { deletedAt: null };
    if (Types.ObjectId.isValid(bannerId) && bannerId.length === 24) {
      // If it's a valid ObjectId, try _id first, then fall back to id
      query.$or = [{ _id: new Types.ObjectId(bannerId) }, { id: bannerId }];
    } else {
      // Otherwise, use the custom id field
      query.id = bannerId;
    }

    const result = await BannerModel.updateOne(query, { $inc: { clickCount: 1 } });
    
    if (result.matchedCount === 0) {
      logger.warn(`Banner not found for click tracking: ${bannerId}`);
    } else if (result.modifiedCount === 0) {
      logger.warn(`Banner click count not updated (already at limit?): ${bannerId}`);
    } else {
      logger.debug(`Banner click tracked successfully: ${bannerId}`);
    }
  } catch (error) {
    logger.error('Failed to track banner click:', error);
    // Don't throw error for tracking - it's not critical
  }
};

