"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReelsQuerySchema = exports.updateReelStatusSchema = exports.updateReelSchema = exports.createReelSchema = void 0;
const zod_1 = require("zod");
const reel_model_1 = require("../models/reel.model");
const streamHighlight_model_1 = require("../models/streamHighlight.model");
/**
 * Create reel validation schema
 */
exports.createReelSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(60, 'Title must be at most 60 characters'),
        description: zod_1.z.string().max(300, 'Description must be at most 300 characters').nullable().optional(),
        originalPath: zod_1.z.string().url('Invalid video URL'),
        thumbnailPath: zod_1.z.string().url('Invalid thumbnail URL').nullable().optional(),
        userId: zod_1.z.string().min(1, 'User ID is required'),
        sportIds: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
/**
 * Update reel validation schema
 */
exports.updateReelSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(60, 'Title must be at most 60 characters').optional(),
        description: zod_1.z.string().max(300, 'Description must be at most 300 characters').nullable().optional(),
        originalPath: zod_1.z.string().url().optional(),
        thumbnailPath: zod_1.z.string().url().nullable().optional(),
        userId: zod_1.z.string().min(1, 'User ID must be a valid MongoDB ObjectId').optional(),
        status: zod_1.z.enum([
            reel_model_1.ReelStatus.APPROVED,
            reel_model_1.ReelStatus.REJECTED,
            reel_model_1.ReelStatus.BLOCKED,
            reel_model_1.ReelStatus.PENDING,
        ]).optional(),
        sportIds: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
/**
 * Update reel status validation schema
 */
exports.updateReelStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum([
            reel_model_1.ReelStatus.APPROVED,
            reel_model_1.ReelStatus.REJECTED,
            reel_model_1.ReelStatus.BLOCKED,
            reel_model_1.ReelStatus.PENDING,
        ]),
    }),
});
/**
 * Get reels query validation schema
 */
exports.getReelsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        status: zod_1.z.enum([
            reel_model_1.ReelStatus.APPROVED,
            reel_model_1.ReelStatus.REJECTED,
            reel_model_1.ReelStatus.BLOCKED,
            reel_model_1.ReelStatus.PENDING,
        ]).optional(),
        videoProcessingStatus: zod_1.z.enum([
            streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED,
            streamHighlight_model_1.VideoProcessingStatus.PROCESSING,
            streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
            streamHighlight_model_1.VideoProcessingStatus.FAILED,
        ]).optional(),
        userId: zod_1.z.string().optional(),
        sportId: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
//# sourceMappingURL=reel.validation.js.map