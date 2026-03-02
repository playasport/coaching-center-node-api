"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHighlightsQuerySchema = exports.updateHighlightStatusSchema = exports.updateHighlightSchema = exports.createHighlightSchema = void 0;
const zod_1 = require("zod");
const streamHighlight_model_1 = require("../models/streamHighlight.model");
/**
 * Create highlight validation schema
 */
exports.createHighlightSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(60, 'Title must be at most 60 characters'),
        description: zod_1.z.string().max(5000).nullable().optional(),
        videoUrl: zod_1.z.string().url('Invalid video URL'),
        thumbnailUrl: zod_1.z.string().url('Invalid thumbnail URL').nullable().optional(),
        userId: zod_1.z.string().min(1, 'User ID is required'),
        coachingCenterId: zod_1.z.string().nullable().optional(),
        duration: zod_1.z.number().min(0).optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).nullable().optional(),
    }),
});
/**
 * Update highlight validation schema
 */
exports.updateHighlightSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(60, 'Title must be at most 60 characters').optional(),
        description: zod_1.z.string().max(5000).nullable().optional(),
        videoUrl: zod_1.z.string().url().optional(),
        thumbnailUrl: zod_1.z.string().url().nullable().optional(),
        userId: zod_1.z.string().min(1, 'User ID must be a valid MongoDB ObjectId').optional(),
        coachingCenterId: zod_1.z
            .preprocess((val) => (val === '' ? null : val), zod_1.z.string().min(1, 'Coaching center ID must be a valid MongoDB ObjectId').nullable().optional())
            .optional(),
        status: zod_1.z.enum([
            streamHighlight_model_1.HighlightStatus.PUBLISHED,
            streamHighlight_model_1.HighlightStatus.ARCHIVED,
            streamHighlight_model_1.HighlightStatus.BLOCKED,
            streamHighlight_model_1.HighlightStatus.DELETED,
        ]).optional(),
        duration: zod_1.z.number().min(0).optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).nullable().optional(),
    }),
});
/**
 * Update highlight status validation schema
 */
exports.updateHighlightStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum([
            streamHighlight_model_1.HighlightStatus.PUBLISHED,
            streamHighlight_model_1.HighlightStatus.ARCHIVED,
            streamHighlight_model_1.HighlightStatus.BLOCKED,
            streamHighlight_model_1.HighlightStatus.DELETED,
        ]),
    }),
});
/**
 * Get highlights query validation schema
 */
exports.getHighlightsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        status: zod_1.z.enum([
            streamHighlight_model_1.HighlightStatus.PUBLISHED,
            streamHighlight_model_1.HighlightStatus.ARCHIVED,
            streamHighlight_model_1.HighlightStatus.BLOCKED,
            streamHighlight_model_1.HighlightStatus.DELETED,
        ]).optional(),
        videoProcessingStatus: zod_1.z.enum([
            streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED,
            streamHighlight_model_1.VideoProcessingStatus.PROCESSING,
            streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
            streamHighlight_model_1.VideoProcessingStatus.FAILED,
        ]).optional(),
        coachingCenterId: zod_1.z.string().optional(),
        userId: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
//# sourceMappingURL=highlight.validation.js.map