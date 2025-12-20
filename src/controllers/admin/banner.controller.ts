import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminBannerService from '../../services/admin/banner.service';
import { BannerStatus, BannerPosition, BannerTargetAudience } from '../../models/banner.model';

/**
 * Get all banners for admin
 */
export const getAllBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { 
      position, 
      status, 
      targetAudience, 
      isActive, 
      search, 
      sortBy, 
      sortOrder 
    } = req.query;

    const params: adminBannerService.GetAdminBannersParams = {
      page,
      limit,
      position: position as BannerPosition,
      status: status as BannerStatus,
      targetAudience: targetAudience as BannerTargetAudience,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminBannerService.getAllBanners(params);

    const response = new ApiResponse(200, result, 'Banners retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get banner by ID for admin
 */
export const getBannerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await adminBannerService.getBannerById(id);

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    const response = new ApiResponse(200, { banner }, 'Banner retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new banner
 */
export const createBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const data: adminBannerService.CreateBannerInput = req.body;

    // Validate required fields
    if (!data.title || !data.imageUrl || !data.position) {
      throw new ApiError(400, 'Title, imageUrl, and position are required');
    }

    const banner = await adminBannerService.createBanner(data, adminId);

    const response = new ApiResponse(201, { banner }, 'Banner created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update banner by admin
 */
export const updateBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const data: adminBannerService.UpdateBannerInput = req.body;

    const banner = await adminBannerService.updateBanner(id, data, adminId);

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    const response = new ApiResponse(200, { banner }, 'Banner updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete banner by admin
 */
export const deleteBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await adminBannerService.deleteBanner(id);

    const response = new ApiResponse(200, null, 'Banner deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update banner status
 */
export const updateBannerStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id;

    if (!status || !Object.values(BannerStatus).includes(status)) {
      throw new ApiError(400, 'Invalid banner status');
    }

    const banner = await adminBannerService.updateBannerStatus(id, status, adminId);

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    const response = new ApiResponse(200, { banner }, 'Banner status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder banners (update priorities)
 */
export const reorderBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bannerOrders } = req.body;
    const adminId = req.user?.id;

    if (!Array.isArray(bannerOrders) || bannerOrders.length === 0) {
      throw new ApiError(400, 'bannerOrders must be a non-empty array');
    }

    // Validate each order item
    for (const order of bannerOrders) {
      if (!order.id || typeof order.priority !== 'number') {
        throw new ApiError(400, 'Each banner order must have id and priority');
      }
    }

    await adminBannerService.reorderBanners(bannerOrders, adminId);

    const response = new ApiResponse(200, null, 'Banners reordered successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};


