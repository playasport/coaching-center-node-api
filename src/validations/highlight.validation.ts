import { z } from 'zod';
import { HighlightStatus, VideoProcessingStatus } from '../models/streamHighlight.model';

/**
 * Create highlight validation schema
 */
export const createHighlightSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(60, 'Title must be at most 60 characters'),
    description: z.string().max(5000).nullable().optional(),
    videoUrl: z.string().url('Invalid video URL'),
    thumbnailUrl: z.string().url('Invalid thumbnail URL').nullable().optional(),
    userId: z.string().min(1, 'User ID is required'),
    coachingCenterId: z.string().nullable().optional(),
    duration: z.number().min(0).optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
  }),
});

/**
 * Update highlight validation schema
 */
export const updateHighlightSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(60, 'Title must be at most 60 characters').optional(),
    description: z.string().max(5000).nullable().optional(),
    videoUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().nullable().optional(),
    userId: z.string().min(1, 'User ID must be a valid MongoDB ObjectId').optional(),
    coachingCenterId: z
      .preprocess(
        (val) => (val === '' ? null : val),
        z.string().min(1, 'Coaching center ID must be a valid MongoDB ObjectId').nullable().optional()
      )
      .optional(),
    status: z.enum([
      HighlightStatus.PUBLISHED,
      HighlightStatus.ARCHIVED,
      HighlightStatus.BLOCKED,
      HighlightStatus.DELETED,
    ]).optional(),
    duration: z.number().min(0).optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
  }),
});

/**
 * Update highlight status validation schema
 */
export const updateHighlightStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      HighlightStatus.PUBLISHED,
      HighlightStatus.ARCHIVED,
      HighlightStatus.BLOCKED,
      HighlightStatus.DELETED,
    ]),
  }),
});

/**
 * Get highlights query validation schema
 */
export const getHighlightsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum([
      HighlightStatus.PUBLISHED,
      HighlightStatus.ARCHIVED,
      HighlightStatus.BLOCKED,
      HighlightStatus.DELETED,
    ]).optional(),
    videoProcessingStatus: z.enum([
      VideoProcessingStatus.NOT_STARTED,
      VideoProcessingStatus.PROCESSING,
      VideoProcessingStatus.COMPLETED,
      VideoProcessingStatus.FAILED,
    ]).optional(),
    coachingCenterId: z.string().optional(),
    userId: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

