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
exports.reprocessHighlightVideo = exports.updateHighlightStatus = exports.deleteHighlight = exports.updateHighlight = exports.uploadHighlightPreview = exports.uploadHighlightMedia = exports.uploadHighlightThumbnail = exports.uploadHighlightVideo = exports.createHighlight = exports.getHighlightById = exports.getAllHighlights = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminHighlightService = __importStar(require("../../services/admin/highlight.service"));
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const coachingCenterMedia_service_1 = require("../../services/common/coachingCenterMedia.service");
/**
 * Get all highlights for admin
 */
const getAllHighlights = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, videoProcessingStatus, coachingCenterId, userId, search, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            status: status,
            videoProcessingStatus: videoProcessingStatus,
            coachingCenterId: coachingCenterId,
            userId: userId,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminHighlightService.getAllHighlights(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Highlights retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllHighlights = getAllHighlights;
/**
 * Get highlight by ID for admin
 */
const getHighlightById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const highlight = await adminHighlightService.getHighlightById(id);
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { highlight }, 'Highlight retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getHighlightById = getHighlightById;
/**
 * Create new highlight
 */
const createHighlight = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const data = req.body;
        // Validate required fields
        if (!data.title || !data.videoUrl || !data.userId) {
            throw new ApiError_1.ApiError(400, 'Title, videoUrl, and userId are required');
        }
        const highlight = await adminHighlightService.createHighlight(data, adminId || '');
        const response = new ApiResponse_1.ApiResponse(201, { highlight }, 'Highlight created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createHighlight = createHighlight;
/**
 * Upload video for highlight
 */
const uploadHighlightVideo = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'Video file is required');
        }
        const videoUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: req.file,
            mediaType: 'video',
        });
        const response = new ApiResponse_1.ApiResponse(200, { videoUrl }, 'Video uploaded successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadHighlightVideo = uploadHighlightVideo;
/**
 * Upload thumbnail for highlight
 */
const uploadHighlightThumbnail = async (req, res, next) => {
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
exports.uploadHighlightThumbnail = uploadHighlightThumbnail;
/**
 * Upload both video and thumbnail
 */
const uploadHighlightMedia = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files.video || files.video.length === 0) {
            throw new ApiError_1.ApiError(400, 'Video file is required');
        }
        const videoUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
            file: files.video[0],
            mediaType: 'video',
        });
        let thumbnailUrl;
        if (files.thumbnail && files.thumbnail.length > 0) {
            thumbnailUrl = await (0, coachingCenterMedia_service_1.uploadMediaFile)({
                file: files.thumbnail[0],
                mediaType: 'image',
            });
        }
        const response = new ApiResponse_1.ApiResponse(200, { videoUrl, thumbnailUrl }, 'Media files uploaded successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadHighlightMedia = uploadHighlightMedia;
/**
 * Upload preview video for a specific highlight
 */
const uploadHighlightPreview = async (req, res, next) => {
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
        // Update the highlight with the preview URL
        const highlight = await adminHighlightService.updateHighlightPreview(id, previewUrl, adminId || '');
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { previewUrl, highlight }, 'Preview video uploaded and updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadHighlightPreview = uploadHighlightPreview;
/**
 * Update highlight by admin
 */
const updateHighlight = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const data = req.body;
        const highlight = await adminHighlightService.updateHighlight(id, data, adminId || '');
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { highlight }, 'Highlight updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateHighlight = updateHighlight;
/**
 * Delete highlight (soft delete)
 */
const deleteHighlight = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const deleted = await adminHighlightService.deleteHighlight(id, adminId || '');
        if (!deleted) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, null, 'Highlight deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteHighlight = deleteHighlight;
/**
 * Update highlight status
 */
const updateHighlightStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const { status } = req.body;
        if (!status || !Object.values(streamHighlight_model_1.HighlightStatus).includes(status)) {
            throw new ApiError_1.ApiError(400, 'Invalid status');
        }
        const highlight = await adminHighlightService.updateHighlightStatus(id, status, adminId || '');
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { highlight }, 'Highlight status updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateHighlightStatus = updateHighlightStatus;
/**
 * Reprocess video for a highlight
 */
const reprocessHighlightVideo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const result = await adminHighlightService.reprocessHighlightVideo(id, adminId || '');
        const response = new ApiResponse_1.ApiResponse(200, result, result.message);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.reprocessHighlightVideo = reprocessHighlightVideo;
//# sourceMappingURL=highlight.controller.js.map