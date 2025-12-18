import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import * as reelService from '../services/client/reel.service';

/**
 * Get paginated list of reels
 * GET /reels?page=1&limit=3
 */
export const getReelsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 3;

    const result = await reelService.getReelsList(page, limit);
    const response = new ApiResponse(200, result, 'Reels retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reels list with a specific reel first (by ID)
 * GET /reels/:id?page=1&limit=3
 */
export const getReelsListWithIdFirst = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 3;

    const result = await reelService.getReelsListWithIdFirst(id, page, limit);
    const response = new ApiResponse(200, result, 'Reels retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
