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
exports.uploadMedia = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const mediaService = __importStar(require("../services/coachingCenterMedia.service"));
/**
 * Unified media upload controller
 * Handles logo, images, videos, and documents in a single endpoint
 */
const uploadMedia = async (req, res, next) => {
    try {
        const files = req.files;
        const result = {};
        // Upload logo if provided
        if (files.logo && files.logo.length > 0) {
            const logoFile = files.logo[0];
            const logoUrl = await mediaService.uploadMediaFile({
                file: logoFile,
                mediaType: 'logo',
            });
            result.logo = {
                url: logoUrl,
                type: 'logo',
            };
        }
        // Upload images if provided
        if (files.images && files.images.length > 0) {
            const imageUrls = await mediaService.uploadMultipleMediaFiles(files.images, 'image');
            result.images = {
                urls: imageUrls,
                count: imageUrls.length,
                type: 'image',
            };
        }
        // Upload videos if provided
        if (files.videos && files.videos.length > 0) {
            const videoUrls = await mediaService.uploadMultipleMediaFiles(files.videos, 'video');
            result.videos = {
                urls: videoUrls,
                count: videoUrls.length,
                type: 'video',
            };
        }
        // Upload documents if provided
        if (files.documents && files.documents.length > 0) {
            const documentUrls = await mediaService.uploadMultipleMediaFiles(files.documents, 'document');
            result.documents = {
                urls: documentUrls,
                count: documentUrls.length,
                type: 'document',
            };
        }
        // Check if at least one file type was uploaded
        if (Object.keys(result).length === 0) {
            throw new ApiError_1.ApiError(400, 'At least one file is required. Send logo, images, videos, or documents.');
        }
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('coachingCenter.media.uploadSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadMedia = uploadMedia;
//# sourceMappingURL=coachingCenterMedia.controller.js.map