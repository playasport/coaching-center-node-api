import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import * as highlightService from '../services/client/highlight.service';

/**
 * Get paginated list of highlights
 * GET /highlights?page=1&limit=10
 */
export const getHighlightsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await highlightService.getHighlightsList(page, limit);
    const response = new ApiResponse(200, result, 'Highlights retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get highlight details by ID
 * GET /highlights/:id
 */
export const getHighlightById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await highlightService.getHighlightById(id);
    const response = new ApiResponse(200, result, 'Highlight retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update highlight view count
 * PUT /highlights/:id/view
 */
export const updateHighlightView = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const viewCount = await highlightService.updateHighlightView(id);
    const response = new ApiResponse(200, { views: viewCount }, 'Highlight view updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
