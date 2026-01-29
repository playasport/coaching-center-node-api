import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminCmsPageService from '../../services/admin/cmsPage.service';
import { CmsPagePlatform } from '../../models/cmsPage.model';

/**
 * Get all CMS pages for admin
 */
export const getAllCmsPages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, slug, platform, isActive, search, sortBy, sortOrder } = req.query;

    const params: adminCmsPageService.GetAdminCmsPagesParams = {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      slug: slug as string,
      platform: platform as CmsPagePlatform,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminCmsPageService.getAllCmsPages(params);

    const response = new ApiResponse(200, result, 'CMS pages retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get CMS page by ID for admin
 */
export const getCmsPageById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const page = await adminCmsPageService.getCmsPageById(id);

    if (!page) {
      throw new ApiError(404, 'CMS page not found');
    }

    const response = new ApiResponse(200, { page }, 'CMS page retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new CMS page
 */
export const createCmsPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = (req as any).user?.id;
    const page = await adminCmsPageService.createCmsPage(req.body, adminId);

    const response = new ApiResponse(201, { page }, 'CMS page created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update CMS page
 */
export const updateCmsPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id;
    const page = await adminCmsPageService.updateCmsPage(id, req.body, adminId);

    if (!page) {
      throw new ApiError(404, 'CMS page not found');
    }

    const response = new ApiResponse(200, { page }, 'CMS page updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete CMS page
 */
export const deleteCmsPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id;
    await adminCmsPageService.deleteCmsPage(id, adminId);

    const response = new ApiResponse(200, null, 'CMS page deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

