import { z } from 'zod';
import { ReelStatus } from '../models/reel.model';
import { VideoProcessingStatus } from '../models/streamHighlight.model';

/**
 * Create reel validation schema
 */
export const createReelSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(60, 'Title must be at most 60 characters'),
    description: z.string().max(300, 'Description must be at most 300 characters').nullable().optional(),
    originalPath: z.string().url('Invalid video URL'),
    thumbnailPath: z.string().url('Invalid thumbnail URL').nullable().optional(),
    userId: z.string().min(1, 'User ID is required'),
    sportIds: z.array(z.string()).optional(),
  }),
});

/**
 * Update reel validation schema
 */
export const updateReelSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(60, 'Title must be at most 60 characters').optional(),
    description: z.string().max(300, 'Description must be at most 300 characters').nullable().optional(),
    originalPath: z.string().url().optional(),
    thumbnailPath: z.string().url().nullable().optional(),
    status: z.enum([
      ReelStatus.APPROVED,
      ReelStatus.REJECTED,
      ReelStatus.BLOCKED,
      ReelStatus.PENDING,
    ]).optional(),
    sportIds: z.array(z.string()).optional(),
  }),
});

/**
 * Update reel status validation schema
 */
export const updateReelStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      ReelStatus.APPROVED,
      ReelStatus.REJECTED,
      ReelStatus.BLOCKED,
      ReelStatus.PENDING,
    ]),
  }),
});

/**
 * Get reels query validation schema
 */
export const getReelsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum([
      ReelStatus.APPROVED,
      ReelStatus.REJECTED,
      ReelStatus.BLOCKED,
      ReelStatus.PENDING,
    ]).optional(),
    videoProcessingStatus: z.enum([
      VideoProcessingStatus.NOT_STARTED,
      VideoProcessingStatus.PROCESSING,
      VideoProcessingStatus.COMPLETED,
      VideoProcessingStatus.FAILED,
    ]).optional(),
    userId: z.string().optional(),
    sportId: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

