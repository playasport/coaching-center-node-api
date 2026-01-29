import { Types } from 'mongoose';
import { CmsPageModel, CmsPage, CmsPagePlatform } from '../../models/cmsPage.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';

export interface GetAdminCmsPagesParams {
  page?: number;
  limit?: number;
  slug?: string;
  platform?: CmsPagePlatform;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminCmsPageListItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  platform: CmsPagePlatform;
  isActive: boolean;
  version: number;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsPagesListResult {
  pages: AdminCmsPageListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCmsPageInput {
  slug: string;
  title: string;
  content: string;
  platform?: CmsPagePlatform;
  isActive?: boolean;
  version?: number;
}

export interface UpdateCmsPageInput {
  slug?: string;
  title?: string;
  content?: string;
  platform?: CmsPagePlatform;
  isActive?: boolean;
  version?: number;
}

/**
 * Get all CMS pages for admin with filters and pagination
 */
export const getAllCmsPages = async (
  params: GetAdminCmsPagesParams = {}
): Promise<CmsPagesListResult> => {
  try {
    const query: any = { deletedAt: null };

    // Filter by slug if provided
    if (params.slug) {
      query.slug = params.slug;
    }

    // Filter by platform if provided
    if (params.platform) {
      query.platform = params.platform;
    }

    // Filter by active status if provided
    if (params.isActive !== undefined) {
      query.isActive = params.isActive;
    }

    // Search by title or content
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { slug: searchRegex },
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
    const total = await CmsPageModel.countDocuments(query);

    // Get pages
    const pages = await CmsPageModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedPages: AdminCmsPageListItem[] = pages.map((page: any) => {
      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        content: page.content,
        platform: page.platform,
        isActive: page.isActive,
        version: page.version,
        updatedBy: page.updatedBy || null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    });

    return {
      pages: transformedPages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Admin failed to get CMS pages:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get CMS page by ID for admin
 */
export const getCmsPageById = async (id: string): Promise<CmsPage | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const page = await CmsPageModel.findOne({ ...query, deletedAt: null }).lean();

    return page as CmsPage | null;
  } catch (error) {
    logger.error('Admin failed to get CMS page by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get CMS page by slug
 */
export const getCmsPageBySlug = async (slug: string): Promise<CmsPage | null> => {
  try {
    const page = await CmsPageModel.findOne({ slug, deletedAt: null, isActive: true }).lean();

    return page as CmsPage | null;
  } catch (error) {
    logger.error('Failed to get CMS page by slug:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create new CMS page
 */
export const createCmsPage = async (
  data: CreateCmsPageInput,
  adminId?: string
): Promise<CmsPage> => {
  try {
    const slug = data.slug.toLowerCase().trim();

    // Check if slug already exists (including soft-deleted pages)
    const existingPage = await CmsPageModel.findOne({ slug });
    if (existingPage) {
      // Permanently delete the old page with the same slug
      await CmsPageModel.deleteOne({ _id: existingPage._id });
      logger.info(`Deleted existing CMS page with slug "${slug}" to allow recreation`);
    }

    const pageData: any = {
      slug,
      title: data.title.trim(),
      content: data.content,
      platform: data.platform || CmsPagePlatform.BOTH,
      isActive: data.isActive !== undefined ? data.isActive : true,
      version: data.version || 1,
      updatedBy: adminId || null,
    };

    const page = new CmsPageModel(pageData);
    await page.save();

    logger.info(`CMS page created: ${page.id} by admin ${adminId}`);
    return page.toObject() as CmsPage;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle MongoDB duplicate key error (E11000) - should not happen after deletion, but just in case
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Try to delete and recreate one more time
      const slug = data.slug.toLowerCase().trim();
      await CmsPageModel.deleteOne({ slug });
      const pageData: any = {
        slug,
        title: data.title.trim(),
        content: data.content,
        platform: data.platform || CmsPagePlatform.BOTH,
        isActive: data.isActive !== undefined ? data.isActive : true,
        version: data.version || 1,
        updatedBy: adminId || null,
      };
      const page = new CmsPageModel(pageData);
      await page.save();
      logger.info(`CMS page created after retry: ${page.id} by admin ${adminId}`);
      return page.toObject() as CmsPage;
    }
    logger.error('Admin failed to create CMS page:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update CMS page
 */
export const updateCmsPage = async (
  id: string,
  data: UpdateCmsPageInput,
  adminId?: string
): Promise<CmsPage | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const page = await CmsPageModel.findOne({ ...query, deletedAt: null });

    if (!page) {
      throw new ApiError(404, 'CMS page not found');
    }

    // If slug is being updated, check if new slug already exists
    if (data.slug && data.slug !== page.slug) {
      const existingPage = await CmsPageModel.findOne({ 
        slug: data.slug.toLowerCase().trim(), 
        deletedAt: null,
        id: { $ne: page.id }
      });
      if (existingPage) {
        throw new ApiError(400, 'CMS page with this slug already exists');
      }
      page.slug = data.slug.toLowerCase().trim();
    }

    // Update fields
    if (data.title !== undefined) page.title = data.title;
    if (data.content !== undefined) page.content = data.content;
    if (data.platform !== undefined) page.platform = data.platform;
    if (data.isActive !== undefined) page.isActive = data.isActive;
    if (data.version !== undefined) page.version = data.version;
    if (adminId) page.updatedBy = adminId;

    await page.save();

    logger.info(`CMS page updated: ${page.id} by admin ${adminId}`);
    return page.toObject() as CmsPage;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to update CMS page:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete CMS page (soft delete)
 */
export const deleteCmsPage = async (id: string, adminId?: string): Promise<boolean> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const page = await CmsPageModel.findOne({ ...query, deletedAt: null });

    if (!page) {
      throw new ApiError(404, 'CMS page not found');
    }

    page.deletedAt = new Date();
    if (adminId) page.updatedBy = adminId;
    await page.save();

    logger.info(`CMS page deleted: ${page.id} by admin ${adminId}`);
    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to delete CMS page:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

