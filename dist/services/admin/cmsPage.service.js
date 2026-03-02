"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCmsPage = exports.updateCmsPage = exports.createCmsPage = exports.getCmsPageBySlug = exports.getCmsPageById = exports.getAllCmsPages = void 0;
const mongoose_1 = require("mongoose");
const cmsPage_model_1 = require("../../models/cmsPage.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
/**
 * Get all CMS pages for admin with filters and pagination
 */
const getAllCmsPages = async (params = {}) => {
    try {
        const query = { deletedAt: null };
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
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await cmsPage_model_1.CmsPageModel.countDocuments(query);
        // Get pages
        const pages = await cmsPage_model_1.CmsPageModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedPages = pages.map((page) => {
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
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get CMS pages:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllCmsPages = getAllCmsPages;
/**
 * Get CMS page by ID for admin
 */
const getCmsPageById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const page = await cmsPage_model_1.CmsPageModel.findOne({ ...query, deletedAt: null }).lean();
        return page;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get CMS page by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCmsPageById = getCmsPageById;
/**
 * Get CMS page by slug
 */
const getCmsPageBySlug = async (slug) => {
    try {
        const page = await cmsPage_model_1.CmsPageModel.findOne({ slug, deletedAt: null, isActive: true }).lean();
        return page;
    }
    catch (error) {
        logger_1.logger.error('Failed to get CMS page by slug:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCmsPageBySlug = getCmsPageBySlug;
/**
 * Create new CMS page
 */
const createCmsPage = async (data, adminId) => {
    try {
        const slug = data.slug.toLowerCase().trim();
        // Check if slug already exists (including soft-deleted pages)
        const existingPage = await cmsPage_model_1.CmsPageModel.findOne({ slug });
        if (existingPage) {
            // Permanently delete the old page with the same slug
            await cmsPage_model_1.CmsPageModel.deleteOne({ _id: existingPage._id });
            logger_1.logger.info(`Deleted existing CMS page with slug "${slug}" to allow recreation`);
        }
        const pageData = {
            slug,
            title: data.title.trim(),
            content: data.content,
            platform: data.platform || cmsPage_model_1.CmsPagePlatform.BOTH,
            isActive: data.isActive !== undefined ? data.isActive : true,
            version: data.version || 1,
            updatedBy: adminId || null,
        };
        const page = new cmsPage_model_1.CmsPageModel(pageData);
        await page.save();
        logger_1.logger.info(`CMS page created: ${page.id} by admin ${adminId}`);
        return page.toObject();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        // Handle MongoDB duplicate key error (E11000) - should not happen after deletion, but just in case
        if (error.code === 11000 || error.name === 'MongoServerError') {
            // Try to delete and recreate one more time
            const slug = data.slug.toLowerCase().trim();
            await cmsPage_model_1.CmsPageModel.deleteOne({ slug });
            const pageData = {
                slug,
                title: data.title.trim(),
                content: data.content,
                platform: data.platform || cmsPage_model_1.CmsPagePlatform.BOTH,
                isActive: data.isActive !== undefined ? data.isActive : true,
                version: data.version || 1,
                updatedBy: adminId || null,
            };
            const page = new cmsPage_model_1.CmsPageModel(pageData);
            await page.save();
            logger_1.logger.info(`CMS page created after retry: ${page.id} by admin ${adminId}`);
            return page.toObject();
        }
        logger_1.logger.error('Admin failed to create CMS page:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.createCmsPage = createCmsPage;
/**
 * Update CMS page
 */
const updateCmsPage = async (id, data, adminId) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const page = await cmsPage_model_1.CmsPageModel.findOne({ ...query, deletedAt: null });
        if (!page) {
            throw new ApiError_1.ApiError(404, 'CMS page not found');
        }
        // If slug is being updated, check if new slug already exists
        if (data.slug && data.slug !== page.slug) {
            const existingPage = await cmsPage_model_1.CmsPageModel.findOne({
                slug: data.slug.toLowerCase().trim(),
                deletedAt: null,
                id: { $ne: page.id }
            });
            if (existingPage) {
                throw new ApiError_1.ApiError(400, 'CMS page with this slug already exists');
            }
            page.slug = data.slug.toLowerCase().trim();
        }
        // Update fields
        if (data.title !== undefined)
            page.title = data.title;
        if (data.content !== undefined)
            page.content = data.content;
        if (data.platform !== undefined)
            page.platform = data.platform;
        if (data.isActive !== undefined)
            page.isActive = data.isActive;
        if (data.version !== undefined)
            page.version = data.version;
        if (adminId)
            page.updatedBy = adminId;
        await page.save();
        logger_1.logger.info(`CMS page updated: ${page.id} by admin ${adminId}`);
        return page.toObject();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to update CMS page:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateCmsPage = updateCmsPage;
/**
 * Delete CMS page (soft delete)
 */
const deleteCmsPage = async (id, adminId) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const page = await cmsPage_model_1.CmsPageModel.findOne({ ...query, deletedAt: null });
        if (!page) {
            throw new ApiError_1.ApiError(404, 'CMS page not found');
        }
        page.deletedAt = new Date();
        if (adminId)
            page.updatedBy = adminId;
        await page.save();
        logger_1.logger.info(`CMS page deleted: ${page.id} by admin ${adminId}`);
        return true;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to delete CMS page:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.deleteCmsPage = deleteCmsPage;
//# sourceMappingURL=cmsPage.service.js.map