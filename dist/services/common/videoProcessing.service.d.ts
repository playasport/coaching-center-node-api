export declare enum VideoProcessingStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface VideoProcessingRequest {
    videoUrl: string;
    highlightId?: string;
    reelId?: string;
    type: 'highlight' | 'reel';
    folderPath?: string;
    options?: {
        generateThumbnail?: boolean;
        generateHLS?: boolean;
        resolutions?: string[];
        quality?: 'low' | 'medium' | 'high';
    };
}
export interface VideoProcessingResponse {
    jobId: string;
    status: VideoProcessingStatus;
    videoUrl?: string;
    thumbnailUrl?: string;
    hlsUrls?: {
        '360p'?: string;
        '480p'?: string;
        '720p'?: string;
        '1080p'?: string;
        [key: string]: string | undefined;
    };
    masterM3u8Url?: string;
    previewUrl?: string;
    duration?: number;
    metadata?: {
        fileSize?: number;
        resolution?: string;
        bitrate?: number;
        format?: string;
        [key: string]: any;
    };
}
export interface VideoProcessingJobStatus {
    jobId: string;
    status: VideoProcessingStatus;
    progress?: number;
    error?: string;
    result?: VideoProcessingResponse;
}
/**
 * Map BullMQ job state to VideoProcessingStatus
 */
export declare const mapJobStateToStatus: (state: string) => VideoProcessingStatus;
//# sourceMappingURL=videoProcessing.service.d.ts.map