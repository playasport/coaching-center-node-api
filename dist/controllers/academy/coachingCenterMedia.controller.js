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
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
const mediaService = __importStar(require("../../services/common/coachingCenterMedia.service"));
/**
 * Unified media upload controller
 * Handles logo, images, videos, and documents in a single endpoint
 */
const uploadMedia = async (req, res, next) => {
    try {
        const files = req.files;
        const result = {};
        // Process all file types in parallel for better performance
        const uploadPromises = [];
        // Prepare logo upload promise
        if (files.logo && files.logo.length > 0) {
            const logoFile = files.logo[0];
            uploadPromises.push(mediaService.uploadMediaFile({
                file: logoFile,
                mediaType: 'logo',
            }).then((logoUrl) => ({
                type: 'logo',
                data: {
                    url: logoUrl,
                    type: 'logo',
                },
            })).catch((error) => {
                logger_1.logger.error('Failed to upload logo', { error });
                return { type: 'logo', error };
            }));
        }
        // Prepare images upload promise
        if (files.images && files.images.length > 0) {
            uploadPromises.push(mediaService.uploadMultipleMediaFiles(files.images, 'image').then((imageUrls) => ({
                type: 'images',
                data: {
                    urls: imageUrls,
                    count: imageUrls.length,
                    type: 'image',
                },
            })).catch((error) => {
                logger_1.logger.error('Failed to upload images', { error, count: files.images.length });
                return { type: 'images', error };
            }));
        }
        // Prepare videos upload promise
        if (files.videos && files.videos.length > 0) {
            uploadPromises.push(mediaService.uploadMultipleMediaFiles(files.videos, 'video').then((videoUrls) => ({
                type: 'videos',
                data: {
                    urls: videoUrls,
                    count: videoUrls.length,
                    type: 'video',
                },
            })).catch((error) => {
                logger_1.logger.error('Failed to upload videos', { error, count: files.videos.length });
                return { type: 'videos', error };
            }));
        }
        // Prepare documents upload promise
        if (files.documents && files.documents.length > 0) {
            uploadPromises.push(mediaService.uploadMultipleMediaFiles(files.documents, 'document').then((documentUrls) => ({
                type: 'documents',
                data: {
                    urls: documentUrls,
                    count: documentUrls.length,
                    type: 'document',
                },
            })).catch((error) => {
                logger_1.logger.error('Failed to upload documents', { error, count: files.documents.length });
                return { type: 'documents', error };
            }));
        }
        // Check if at least one file type was provided
        if (uploadPromises.length === 0) {
            throw new ApiError_1.ApiError(400, 'At least one file is required. Send logo, images, videos, or documents.');
        }
        // Wait for all uploads to complete in parallel
        const uploadResults = await Promise.all(uploadPromises);
        // Process results and build response
        let hasSuccess = false;
        const errors = [];
        for (const uploadResult of uploadResults) {
            if (uploadResult.error) {
                // Log error and track it
                const errorMessage = uploadResult.error instanceof Error
                    ? uploadResult.error.message
                    : String(uploadResult.error);
                errors.push(`${uploadResult.type}: ${errorMessage}`);
                logger_1.logger.warn(`Upload failed for ${uploadResult.type}`, { error: uploadResult.error });
                continue;
            }
            hasSuccess = true;
            switch (uploadResult.type) {
                case 'logo':
                    result.logo = uploadResult.data;
                    break;
                case 'images':
                    result.images = uploadResult.data;
                    break;
                case 'videos':
                    result.videos = uploadResult.data;
                    break;
                case 'documents':
                    result.documents = uploadResult.data;
                    break;
            }
        }
        // If all uploads failed, throw error
        if (!hasSuccess) {
            throw new ApiError_1.ApiError(500, `All file uploads failed: ${errors.join('; ')}`);
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