import { z } from 'zod';
import { ReelStatus } from '../models/reel.model';
import { VideoProcessingStatus } from '../models/streamHighlight.model';
/**
 * Create reel validation schema
 */
export declare const createReelSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        originalPath: z.ZodString;
        thumbnailPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodString;
        sportIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update reel validation schema
 */
export declare const updateReelSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        originalPath: z.ZodOptional<z.ZodString>;
        thumbnailPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            approved: ReelStatus.APPROVED;
            rejected: ReelStatus.REJECTED;
            blocked: ReelStatus.BLOCKED;
            pending: ReelStatus.PENDING;
        }>>;
        sportIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update reel status validation schema
 */
export declare const updateReelStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<{
            approved: ReelStatus.APPROVED;
            rejected: ReelStatus.REJECTED;
            blocked: ReelStatus.BLOCKED;
            pending: ReelStatus.PENDING;
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get reels query validation schema
 */
export declare const getReelsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        status: z.ZodOptional<z.ZodEnum<{
            approved: ReelStatus.APPROVED;
            rejected: ReelStatus.REJECTED;
            blocked: ReelStatus.BLOCKED;
            pending: ReelStatus.PENDING;
        }>>;
        videoProcessingStatus: z.ZodOptional<z.ZodEnum<{
            not_started: VideoProcessingStatus.NOT_STARTED;
            processing: VideoProcessingStatus.PROCESSING;
            completed: VideoProcessingStatus.COMPLETED;
            failed: VideoProcessingStatus.FAILED;
        }>>;
        userId: z.ZodOptional<z.ZodString>;
        sportId: z.ZodOptional<z.ZodString>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=reel.validation.d.ts.map