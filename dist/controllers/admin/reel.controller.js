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
exports.uploadReelPreview = exports.reprocessReelVideo = exports.updateReelStatus = exports.deleteReel = exports.updateReel = exports.createReel = exports.uploadReelMedia = exports.uploadReelThumbnail = exports.uploadReelVideo = exports.getReelById = exports.getAllReels = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminReelService = __importStar(require("../../services/admin/reel.service"));
const coachingCenterMedia_service_1 = require("../../services/common/coachingCenterMedia.service");
const videoDurationValidation_service_1 = require("../../services/common/videoDurationValidation.service");
/**
 * Get all reels for admin
 */
const getAllReels = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, videoProcessingStatus, userId, sportId, search, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            status: status,
            videoProcessingStatus: videoProcessingStatus,
            userId: userId,
            sportId: sportId,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminReelService.getAllReels(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Reels retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllReels = getAllReels;
/**
 * Get reel by ID for admin
 */
const getReelById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reel = await adminReelService.getReelById(id);
        if (!reel) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { reel }, 'Reel retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReelById = getReelById;
/**
 * Upload video for reel
 * Validates video duration (max 90 seconds) during upload
 */
const uploadReelVideo = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'Video file is required');
        }
        // Validate video duration from buffer (max 90 seconds for reels)
        // This is faster than downloading from S3 later
        const duration = await (0, videoDurationValidation_service_1.validateVideoDurationFromBuffer)(req.file.buffer, 90, req.file.originalname);
        // Upload to S3
        const videoUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: req.file,
            mediaType: 'video',
        });
        const response = new ApiResponse_1.ApiResponse(200, { videoUrl, duration: Math.round(duration) }, 'Video uploaded successfully. Duration validated.');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadReelVideo = uploadReelVideo;
/**
 * Upload thumbnail for reel
 */
const uploadReelThumbnail = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'Thumbnail file is required');
        }
        const thumbnailUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: req.file,
            mediaType: 'image',
        });
        const response = new ApiResponse_1.ApiResponse(200, { thumbnailUrl }, 'Thumbnail uploaded successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadReelThumbnail = uploadReelThumbnail;
/**
 * Upload both video and thumbnail
 * Validates video duration (max 90 seconds) during upload
 */
const uploadReelMedia = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files.video || files.video.length === 0) {
            throw new ApiError_1.ApiError(400, 'Video file is required');
        }
        const videoFile = files.video[0];
        // Validate video duration from buffer (max 90 seconds for reels)
        // This is faster than downloading from S3 later
        const duration = await (0, videoDurationValidation_service_1.validateVideoDurationFromBuffer)(videoFile.buffer, 90, videoFile.originalname);
        const videoUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: videoFile,
            mediaType: 'video',
        });
        let thumbnailUrl;
        if (files.thumbnail && files.thumbnail.length > 0) {
            thumbnailUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
                file: files.thumbnail[0],
                mediaType: 'image',
            });
        }
        const response = new ApiResponse_1.ApiResponse(200, { videoUrl, thumbnailUrl, duration: Math.round(duration) }, 'Media files uploaded successfully. Duration validated.');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadReelMedia = uploadReelMedia;
/**
 * Create reel by admin
 */
const createReel = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const data = req.body;
        const reel = await adminReelService.createReel(data, adminId || '');
        const response = new ApiResponse_1.ApiResponse(201, { reel }, 'Reel created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createReel = createReel;
/**
 * Update reel by admin
 */
const updateReel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const data = req.body;
        const reel = await adminReelService.updateReel(id, data, adminId || '');
        if (!reel) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { reel }, 'Reel updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateReel = updateReel;
/**
 * Delete reel (soft delete)
 */
const deleteReel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const deleted = await adminReelService.deleteReel(id, adminId || '');
        if (!deleted) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, null, 'Reel deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteReel = deleteReel;
/**
 * Update reel status
 */
const updateReelStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const adminId = req.user?.id;
        const reel = await adminReelService.updateReelStatus(id, status, adminId || '');
        if (!reel) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { reel }, 'Reel status updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateReelStatus = updateReelStatus;
/**
 * Reprocess video for a reel
 */
const reprocessReelVideo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const result = await adminReelService.reprocessReelVideo(id, adminId || '');
        const response = new ApiResponse_1.ApiResponse(200, result, result.message);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.reprocessReelVideo = reprocessReelVideo;
/**
 * Upload preview video for a specific reel
 */
const uploadReelPreview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'Preview video file is required');
        }
        const previewUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: req.file,
            mediaType: 'video',
        });
        // Update the reel with the preview URL
        const reel = await adminReelService.updateReelPreview(id, previewUrl, adminId || '');
        if (!reel) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { previewUrl, reel }, 'Preview video uploaded and updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadReelPreview = uploadReelPreview;
//# sourceMappingURL=reel.controller.js.map