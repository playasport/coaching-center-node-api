import { Types } from 'mongoose';
import { BannerModel, Banner, BannerStatus, BannerPosition, BannerTargetAudience } from '../../models/banner.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';

export interface GetAdminBannersParams {
  page?: number;
  limit?: number;
  position?: BannerPosition;
  status?: BannerStatus;
  targetAudience?: BannerTargetAudience;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminBannerListItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  position: string;
  priority: number;
  status: string;
  targetAudience: string;
  isActive: boolean;
  clickCount: number;
  viewCount: number;
  createdAt: Date;
}

export interface AdminPaginatedBannersResult {
  banners: AdminBannerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateBannerInput {
  title: string;
  description?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  linkType?: 'internal' | 'external' | null;
  position: BannerPosition;
  priority?: number;
  status?: BannerStatus;
  targetAudience?: BannerTargetAudience;
  isActive?: boolean;
  isOnlyForAcademy?: boolean;
  sportIds?: string[] | null;
  centerIds?: string[] | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateBannerInput {
  title?: string;
  description?: string | null;
  imageUrl?: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  linkType?: 'internal' | 'external' | null;
  position?: BannerPosition;
  priority?: number;
  status?: BannerStatus;
  targetAudience?: BannerTargetAudience;
  isActive?: boolean;
  isOnlyForAcademy?: boolean;
  sportIds?: string[] | null;
  centerIds?: string[] | null;
  metadata?: Record<string, any> | null;
}

/**
 * Get all banners for admin with filters and pagination
 */
export const getAllBanners = async (
  params: GetAdminBannersParams = {}
): Promise<AdminPaginatedBannersResult> => {
  try {
    const query: any = { deletedAt: null };

    // Filter by position if provided
    if (params.position) {
      query.position = params.position;
    }

    // Filter by status if provided
    if (params.status) {
      query.status = params.status;
    }

    // Filter by target audience if provided
    if (params.targetAudience) {
      query.targetAudience = params.targetAudience;
    }

    // Filter by active status if provided
    if (params.isActive !== undefined) {
      query.isActive = params.isActive;
    }

    // Search by title or description
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await BannerModel.countDocuments(query);

    // Get banners
    const banners = await BannerModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedBanners: AdminBannerListItem[] = banners.map((banner: any) => {
      return {
        id: banner.id,
        title: banner.title,
        description: banner.description || null,
        imageUrl: banner.imageUrl,
        mobileImageUrl: banner.mobileImageUrl || null,
        linkUrl: banner.linkUrl || null,
        position: banner.position,
        priority: banner.priority,
        status: banner.status,
        targetAudience: banner.targetAudience,
        isActive: banner.isActive,
        isOnlyForAcademy: banner.isOnlyForAcademy,
        clickCount: banner.clickCount,
        viewCount: banner.viewCount,
        createdAt: banner.createdAt,
      };
    });

    return {
      banners: transformedBanners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Admin failed to get banners:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get banner by ID for admin
 */
export const getBannerById = async (id: string): Promise<Banner | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const banner = await BannerModel.findOne({ ...query, deletedAt: null }).lean();

    return banner as Banner | null;
  } catch (error) {
    logger.error('Admin failed to get banner by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create new banner
 */
export const createBanner = async (
  data: CreateBannerInput,
  adminId?: string
): Promise<Banner> => {
  try {
    const bannerData: any = {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl,
      mobileImageUrl: data.mobileImageUrl || null,
      linkUrl: data.linkUrl || null,
      linkType: data.linkType || null,
      position: data.position,
      priority: data.priority || 0,
      status: data.status || BannerStatus.DRAFT,
      targetAudience: data.targetAudience || BannerTargetAudience.ALL,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isOnlyForAcademy: data.isOnlyForAcademy !== undefined ? data.isOnlyForAcademy : false,
      sportIds: data.sportIds || null,
      centerIds: data.centerIds || null,
      metadata: data.metadata || null,
      createdBy: adminId || null,
      clickCount: 0,
      viewCount: 0,
    };

    const banner = new BannerModel(bannerData);
    await banner.save();

    logger.info(`Banner created: ${banner.id} by admin ${adminId}`);
    return banner.toObject() as Banner;
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new ApiError(400, 'Banner with this ID already exists');
    }
    logger.error('Admin failed to create banner:', error);
    throw new ApiError(500, 'Failed to create banner');
  }
};

/**
 * Update banner by admin
 */
export const updateBanner = async (
  id: string,
  data: UpdateBannerInput,
  adminId?: string
): Promise<Banner | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const banner = await BannerModel.findOne({ ...query, deletedAt: null });

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    // Update fields
    if (data.title !== undefined) banner.title = data.title;
    if (data.description !== undefined) banner.description = data.description;
    if (data.imageUrl !== undefined) banner.imageUrl = data.imageUrl;
    if (data.mobileImageUrl !== undefined) banner.mobileImageUrl = data.mobileImageUrl;
    if (data.linkUrl !== undefined) banner.linkUrl = data.linkUrl;
    if (data.linkType !== undefined) banner.linkType = data.linkType;
    if (data.position !== undefined) banner.position = data.position;
    if (data.priority !== undefined) banner.priority = data.priority;
    if (data.status !== undefined) banner.status = data.status;
    if (data.targetAudience !== undefined) banner.targetAudience = data.targetAudience;
    if (data.isActive !== undefined) banner.isActive = data.isActive;
    if (data.isOnlyForAcademy !== undefined) banner.isOnlyForAcademy = data.isOnlyForAcademy;
    if (data.sportIds !== undefined) banner.sportIds = data.sportIds;
    if (data.centerIds !== undefined) banner.centerIds = data.centerIds;
    if (data.metadata !== undefined) banner.metadata = data.metadata;
    if (adminId) banner.updatedBy = adminId;

    await banner.save();

    logger.info(`Banner updated: ${id} by admin ${adminId}`);
    return banner.toObject() as Banner;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update banner:', error);
    throw new ApiError(500, 'Failed to update banner');
  }
};

/**
 * Delete banner (soft delete)
 */
export const deleteBanner = async (id: string): Promise<void> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const banner = await BannerModel.findOne({ ...query, deletedAt: null });

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    banner.deletedAt = new Date();
    await banner.save();

    logger.info(`Banner soft deleted: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to delete banner:', error);
    throw new ApiError(500, 'Failed to delete banner');
  }
};

/**
 * Update banner status
 */
export const updateBannerStatus = async (
  id: string,
  status: BannerStatus,
  adminId?: string
): Promise<Banner | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const banner = await BannerModel.findOneAndUpdate(
      { ...query, deletedAt: null },
      {
        $set: {
          status,
          updatedBy: adminId || null,
        },
      },
      { new: true }
    ).lean();

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    logger.info(`Banner status updated to ${status} for banner ${id} by admin ${adminId}`);
    return banner as Banner;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update banner status:', error);
    throw new ApiError(500, 'Failed to update banner status');
  }
};

/**
 * Reorder banners (update priorities)
 */
export const reorderBanners = async (
  bannerOrders: Array<{ id: string; priority: number }>,
  adminId?: string
): Promise<void> => {
  try {
    const updatePromises = bannerOrders.map(({ id, priority }) => {
      const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
      return BannerModel.findOneAndUpdate(
        { ...query, deletedAt: null },
        {
          $set: {
            priority,
            updatedBy: adminId || null,
          },
        }
      );
    });

    await Promise.all(updatePromises);

    logger.info(`Banners reordered by admin ${adminId}`);
  } catch (error) {
    logger.error('Admin failed to reorder banners:', error);
    throw new ApiError(500, 'Failed to reorder banners');
  }
};

/**
 * Get active banners by position (for public API)
 */
export const getActiveBannersByPosition = async (
  position: BannerPosition,
  options?: {
    sportId?: string;
    centerId?: string;
    limit?: number;
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

