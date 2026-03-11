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
exports.uploadBannerImages = exports.uploadBannerImage = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const bannerImageService = __importStar(require("../../services/admin/bannerImage.service"));
/**
 * Upload single banner image (desktop or mobile)
 */
const uploadBannerImage = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'No image file provided');
        }
        // Determine type from query parameter or default to desktop
        const type = req.query.type || 'desktop';
        const imageUrl = await bannerImageService.uploadBannerImage(req.file, type);
        const response = new ApiResponse_1.ApiResponse(200, { imageUrl, type }, 'Banner image uploaded successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadBannerImage = uploadBannerImage;
/**
 * Upload banner images (desktop and mobile)
 */
const uploadBannerImages = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files.image || files.image.length === 0) {
            throw new ApiError_1.ApiError(400, 'Desktop image (image) is required');
        }
        const desktopFile = files.image[0];
        const mobileFile = files.mobileImage && files.mobileImage.length > 0 ? files.mobileImage[0] : undefined;
        const result = await bannerImageService.uploadBannerImages(desktopFile, mobileFile);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Banner images uploaded successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadBannerImages = uploadBannerImages;
//# sourceMappingURL=bannerImage.controller.js.map