import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as adminCmsPageService from '../services/admin/cmsPage.service';

/**
 * Get CMS page by slug (public endpoint)
 */
export const getCmsPageBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const { platform } = req.query;

    if (!slug) {
      res.status(400).json(new ApiResponse(400, null, 'Slug is required'));
      return;
    }

    const page = await adminCmsPageService.getCmsPageBySlug(slug);

    if (!page) {
      throw new ApiError(404, 'CMS page not found');
    }

    // Filter by platform if provided
    if (platform && page.platform !== 'both' && page.platform !== platform) {
      throw new ApiError(404, 'CMS page not found for this platform');
    }

    // Return only required fields: slug, title, content, updatedAt
    const filteredPage = {
      slug: page.slug,
      title: page.title,
      content: page.content,
      updatedAt: page.updatedAt,
    };

    const response = new ApiResponse(200, { ...filteredPage }, 'CMS page retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

