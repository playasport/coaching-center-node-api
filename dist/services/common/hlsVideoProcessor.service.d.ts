interface PreviewResult {
    previewPath: string;
    previewUrl: string;
    sizeKB: number;
}
interface ProcessingResult {
    masterPlaylistUrl: string;
    thumbnailUrl: string;
    previewUrl: string | null;
    duration: number;
    qualities: Array<{
        name: string;
        playlistUrl: string;
    }>;
}
export declare function createVideoPreviewFromS3(s3Url: string, savePath: string): Promise<PreviewResult>;
export declare function processVideoToHLS(s3Url: string, savePath: string, _reelId: string, existingThumbnailUrl?: string | null): Promise<ProcessingResult>;
export {};
//# sourceMappingURL=hlsVideoProcessor.service.d.ts.map