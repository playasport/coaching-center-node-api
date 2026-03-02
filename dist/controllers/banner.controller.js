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
exports.trackBannerClick = exports.trackBannerView = exports.getBannersByPosition = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const bannerService = __importStar(require("../services/client/banner.service"));
const banner_model_1 = require("../models/banner.model");
/**
 * Get active banners by position (public endpoint)
 */
const getBannersByPosition = async (req, res, next) => {
    try {
        const { position } = req.params;
        const { sportId, centerId, limit, targetAudience } = req.query;
        // Validate position
        if (!Object.values(banner_model_1.BannerPosition).includes(position)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(400, null, 'Invalid banner position'));
            return;
        }
        const banners = await bannerService.getActiveBannersByPosition(position, {
            sportId: sportId,
            centerId: centerId,
            limit: limit ? parseInt(limit) : undefined,
            targetAudience: targetAudience,
        });
        const response = new ApiResponse_1.ApiResponse(200, { banners }, 'Banners retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBannersByPosition = getBannersByPosition;
/**
 * Track banner view
 */
const trackBannerView = async (req, res, next) => {
    try {
        const { id } = req.params;
        await bannerService.trackBannerView(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Banner view tracked successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.trackBannerView = trackBannerView;
/**
 * Track banner click
 */
const trackBannerClick = async (req, res, next) => {
    try {
        const { id } = req.params;
        await bannerService.trackBannerClick(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Banner click tracked successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.trackBannerClick = trackBannerClick;
//# sourceMappingURL=banner.controller.js.map