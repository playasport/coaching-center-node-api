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
exports.reorderBanners = exports.updateBannerStatus = exports.deleteBanner = exports.updateBanner = exports.createBanner = exports.getBannerById = exports.getAllBanners = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminBannerService = __importStar(require("../../services/admin/banner.service"));
const banner_model_1 = require("../../models/banner.model");
/**
 * Get all banners for admin
 */
const getAllBanners = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { position, status, targetAudience, isActive, search, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            position: position,
            status: status,
            targetAudience: targetAudience,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminBannerService.getAllBanners(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Banners retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBanners = getAllBanners;
/**
 * Get banner by ID for admin
 */
const getBannerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const banner = await adminBannerService.getBannerById(id);
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { banner }, 'Banner retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBannerById = getBannerById;
/**
 * Create new banner
 */
const createBanner = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const data = req.body;
        // Validate required fields
        if (!data.title || !data.imageUrl || !data.position) {
            throw new ApiError_1.ApiError(400, 'Title, imageUrl, and position are required');
        }
        const banner = await adminBannerService.createBanner(data, adminId);
        const response = new ApiResponse_1.ApiResponse(201, { banner }, 'Banner created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createBanner = createBanner;
/**
 * Update banner by admin
 */
const updateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const data = req.body;
        const banner = await adminBannerService.updateBanner(id, data, adminId);
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { banner }, 'Banner updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBanner = updateBanner;
/**
 * Delete banner by admin
 */
const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminBannerService.deleteBanner(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Banner deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBanner = deleteBanner;
/**
 * Update banner status
 */
const updateBannerStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const adminId = req.user?.id;
        if (!status || !Object.values(banner_model_1.BannerStatus).includes(status)) {
            throw new ApiError_1.ApiError(400, 'Invalid banner status');
        }
        const banner = await adminBannerService.updateBannerStatus(id, status, adminId);
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { banner }, 'Banner status updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBannerStatus = updateBannerStatus;
/**
 * Reorder banners (update priorities)
 */
const reorderBanners = async (req, res, next) => {
    try {
        const { bannerOrders } = req.body;
        const adminId = req.user?.id;
        if (!Array.isArray(bannerOrders) || bannerOrders.length === 0) {
            throw new ApiError_1.ApiError(400, 'bannerOrders must be a non-empty array');
        }
        // Validate each order item
        for (const order of bannerOrders) {
            if (!order.id || typeof order.priority !== 'number') {
                throw new ApiError_1.ApiError(400, 'Each banner order must have id and priority');
            }
        }
        await adminBannerService.reorderBanners(bannerOrders, adminId);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Banners reordered successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.reorderBanners = reorderBanners;
//# sourceMappingURL=banner.controller.js.map