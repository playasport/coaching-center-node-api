import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { t } from '../utils/i18n';
import * as sitemapService from '../services/client/sitemap.service';

/**
 * Get sitemap data (coaching centres, sports, reels, highlights).
 * GET /sitemap
 * Public, no auth required.
 */
export const getSitemap = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await sitemapService.getSitemapData();
    const response = new ApiResponse(200, data, t('sitemap.getSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};
