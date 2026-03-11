"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCmsPage = exports.updateCmsPage = exports.createCmsPage = exports.getCmsPageById = exports.getAllCmsPages = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminCmsPageService = __importStar(require("../../services/admin/cmsPage.service"));
/**
 * Get all CMS pages for admin
 */
const getAllCmsPages = async (req, res, next) => {
    try {
        const { page, limit, slug, platform, isActive, search, sortBy, sortOrder } = req.query;
        const params = {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            slug: slug,
            platform: platform,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminCmsPageService.getAllCmsPages(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'CMS pages retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCmsPages = getAllCmsPages;
/**
 * Get CMS page by ID for admin
 */
const getCmsPageById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = await adminCmsPageService.getCmsPageById(id);
        if (!page) {
            throw new ApiError_1.ApiError(404, 'CMS page not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { page }, 'CMS page retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCmsPageById = getCmsPageById;
/**
 * Create new CMS page
 */
const createCmsPage = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const page = await adminCmsPageService.createCmsPage(req.body, adminId);
        const response = new ApiResponse_1.ApiResponse(201, { page }, 'CMS page created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCmsPage = createCmsPage;
/**
 * Update CMS page
 */
const updateCmsPage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const page = await adminCmsPageService.updateCmsPage(id, req.body, adminId);
        if (!page) {
            throw new ApiError_1.ApiError(404, 'CMS page not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { page }, 'CMS page updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCmsPage = updateCmsPage;
/**
 * Delete CMS page
 */
const deleteCmsPage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        await adminCmsPageService.deleteCmsPage(id, adminId);
        const response = new ApiResponse_1.ApiResponse(200, null, 'CMS page deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCmsPage = deleteCmsPage;
//# sourceMappingURL=cmsPage.controller.js.map