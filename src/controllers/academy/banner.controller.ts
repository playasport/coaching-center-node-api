import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as bannerService from '../../services/client/banner.service';
import { BannerPosition } from '../../models/banner.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { getUserObjectId } from '../../utils/userCache';
import { t } from '../../utils/i18n';

/**
 * Get banners for coaching center
 * Returns banners that are either general or targeted to this specific center
 */
export const getCenterBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position, sportId, limit, centerId: queryCenterId } = req.query;
    const user = req.user;

    if (!user || !user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get center IDs from user's coaching centers
    let centerIds: string[] = [];
    
    if (queryCenterId) {
      // If specific center ID is provided, verify it belongs to user
      const userObjectId = await getUserObjectId(user.id);
      if (!userObjectId) {
        throw new ApiError(404, 'User not found');
      }

      const center = await CoachingCenterModel.findOne({
        id: queryCenterId as string,
        user: userObjectId,
        is_deleted: false,
      }).select('id').lean();

      if (!center) {
        throw new ApiError(403, 'Center does not belong to you');
      }

      centerIds = [center.id as string];
    } else {
      // Get all center IDs owned by the user
      const userObjectId = await getUserObjectId(user.id);
      if (!userObjectId) {
        throw new ApiError(404, 'User not found');
      }

      const coachingCenters = await CoachingCenterModel.find({
        user: userObjectId,
        is_deleted: false,
      }).select('id').lean();

      centerIds = coachingCenters.map(center => center.id as string);
    }

    // Default to center_page position if not specified
    const bannerPosition = (position as BannerPosition) || BannerPosition.CENTER_PAGE;

    // Validate position
    if (!Object.values(BannerPosition).includes(bannerPosition)) {
      res.status(400).json(new ApiResponse(400, null, 'Invalid banner position'));
      return;
    }

    // Get banners for each center and general banners in parallel
    const bannerPromises: Promise<any[]>[] = [];
    
    // Get banners for each center
    for (const centerId of centerIds) {
      bannerPromises.push(
        bannerService.getActiveBannersByPosition(
          bannerPosition,
          {
            centerId,
            sportId: sportId as string,
            limit: limit ? parseInt(limit as string) : undefined,
            academyOnly: true, // Include academy-only banners
          }
        )
      );
    }

    // Also get general banners (centerIds: null)
    bannerPromises.push(
      bannerService.getActiveBannersByPosition(
        bannerPosition,
        {
          sportId: sportId as string,
          limit: limit ? parseInt(limit as string) : undefined,
          academyOnly: true, // Include academy-only banners
        }
      )
    );

    // Execute all banner queries in parallel
    const bannerResults = await Promise.all(bannerPromises);
    const allBanners = bannerResults.flat();

    // Remove duplicates and sort by priority
    const uniqueBanners = Array.from(
      new Map(allBanners.map(banner => [banner.id, banner])).values()
    ).sort((a, b) => b.priority - a.priority);

    const banners = uniqueBanners.slice(0, limit ? parseInt(limit as string) : 10);

    const response = new ApiResponse(200, { banners }, 'Banners retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all banners for coaching center (all positions)
 */
export const getAllCenterBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sportId, limit, centerId: queryCenterId } = req.query;
    const user = req.user;

    if (!user || !user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get user ObjectId once (cached lookup)
    const userObjectId = await getUserObjectId(user.id);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Get center IDs from user's coaching centers
    let centerIds: string[] = [];
    
    if (queryCenterId) {
      // If specific center ID is provided, verify it belongs to user
      const center = await CoachingCenterModel.findOne({
        id: queryCenterId as string,
        user: userObjectId,
        is_deleted: false,
      }).select('id').lean();

      if (!center) {
        throw new ApiError(403, 'Center does not belong to you');
      }

      centerIds = [center.id as string];
    } else {
      // Get all center IDs owned by the user
      const coachingCenters = await CoachingCenterModel.find({
        user: userObjectId,
        is_deleted: false,
      }).select('id').lean();

      centerIds = coachingCenters.map(center => center.id as string);
    }

    // Get banners for common positions used on center pages
    const positions = [
      BannerPosition.CENTER_PAGE,
      BannerPosition.HOMEPAGE_TOP,
      BannerPosition.HOMEPAGE_MIDDLE,
    ];

    // Build all banner queries in parallel (for all positions and centers)
    const bannerPromises: Promise<any[]>[] = [];
    
    for (const position of positions) {
      // Get banners for each center
      for (const centerId of centerIds) {
        bannerPromises.push(
          bannerService.getActiveBannersByPosition(
            position,
            {
              centerId,
              sportId: sportId as string,
              limit: limit ? parseInt(limit as string) : 5,
              academyOnly: true, // Include academy-only banners
            }
          ).then(banners => banners.map(b => ({ ...b, position })))
        );
      }

      // Also get general banners (centerIds: null)
      bannerPromises.push(
        bannerService.getActiveBannersByPosition(
          position,
          {
            sportId: sportId as string,
            limit: limit ? parseInt(limit as string) : 5,
            academyOnly: true, // Include academy-only banners
          }
        ).then(banners => banners.map(b => ({ ...b, position })))
      );
    }

    // Execute all banner queries in parallel
    const bannerResults = await Promise.all(bannerPromises);
    const allBanners = bannerResults.flat();

    // Remove duplicates and group by position
    const bannersByPosition = allBanners.reduce((acc, banner) => {
      if (!acc[banner.position]) {
        acc[banner.position] = [];
      }
      acc[banner.position].push(banner);
      return acc;
    }, {} as Record<string, any[]>);

    const response = new ApiResponse(200, { banners: bannersByPosition }, 'Banners retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

