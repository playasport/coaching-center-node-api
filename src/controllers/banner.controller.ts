import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import * as bannerService from '../services/client/banner.service';
import { BannerPosition } from '../models/banner.model';

/**
 * Get active banners by position (public endpoint)
 */
export const getBannersByPosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position } = req.params;
    const { sportId, centerId, limit, targetAudience } = req.query;

    // Validate position
    if (!Object.values(BannerPosition).includes(position as BannerPosition)) {
      res.status(400).json(new ApiResponse(400, null, 'Invalid banner position'));
      return;
    }

    const banners = await bannerService.getActiveBannersByPosition(
      position as BannerPosition,
      {
        sportId: sportId as string,
        centerId: centerId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        targetAudience: targetAudience as string,
      }
    );

    const response = new ApiResponse(200, { banners }, 'Banners retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Track banner view
 */
export const trackBannerView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await bannerService.trackBannerView(id);
    const response = new ApiResponse(200, null, 'Banner view tracked successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Track banner click
 */
export const trackBannerClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await bannerService.trackBannerClick(id);
    const response = new ApiResponse(200, null, 'Banner click tracked successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

