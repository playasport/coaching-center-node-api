import { z } from 'zod';
import { HighlightStatus, VideoProcessingStatus } from '../models/streamHighlight.model';
/**
 * Create highlight validation schema
 */
export declare const createHighlightSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        videoUrl: z.ZodString;
        thumbnailUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodString;
        coachingCenterId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        duration: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update highlight validation schema
 */
export declare const updateHighlightSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        videoUrl: z.ZodOptional<z.ZodString>;
        thumbnailUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodOptional<z.ZodString>;
        coachingCenterId: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNullable<z.ZodString>>>>;
        status: z.ZodOptional<z.ZodEnum<{
            published: HighlightStatus.PUBLISHED;
            archived: HighlightStatus.ARCHIVED;
            blocked: HighlightStatus.BLOCKED;
            deleted: HighlightStatus.DELETED;
        }>>;
        duration: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update highlight status validation schema
 */
export declare const updateHighlightStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<{
            published: HighlightStatus.PUBLISHED;
            archived: HighlightStatus.ARCHIVED;
            blocked: HighlightStatus.BLOCKED;
            deleted: HighlightStatus.DELETED;
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get highlights query validation schema
 */
export declare const getHighlightsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        status: z.ZodOptional<z.ZodEnum<{
            published: HighlightStatus.PUBLISHED;
            archived: HighlightStatus.ARCHIVED;
            blocked: HighlightStatus.BLOCKED;
            deleted: HighlightStatus.DELETED;
        }>>;
        videoProcessingStatus: z.ZodOptional<z.ZodEnum<{
            not_started: VideoProcessingStatus.NOT_STARTED;
            processing: VideoProcessingStatus.PROCESSING;
            completed: VideoProcessingStatus.COMPLETED;
            failed: VideoProcessingStatus.FAILED;
        }>>;
        coachingCenterId: z.ZodOptional<z.ZodString>;
        userId: z.ZodOptional<z.ZodString>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=highlight.validation.d.ts.map