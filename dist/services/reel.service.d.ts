export interface ReelListItem {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    title: string;
    description: string | null;
    share_url: string;
    user: {
        name: string;
        avatar: string | null;
    };
    likes: number;
    views: number;
    comments: number;
}
export interface ReelsListResponse {
    reels: ReelListItem[];
    total: number;
    current_page: number;
    total_pages: number;
    limit: number;
}
/**
 * Build reel URLs (video, video preview, thumbnail) from reel data
 * Note: Database now stores full URLs, so we use them directly
 */
export interface ReelUrls {
    videoUrl: string;
    videoPreviewUrl: string;
    thumbnailUrl: string;
}
export declare const buildReelUrls: (reel: {
    masterM3u8Url?: string | null;
    previewUrl?: string | null;
    thumbnailPath?: string | null;
}) => ReelUrls;
/**
 * Get paginated list of approved reels
 */
export declare const getReelsList: (page?: number, limit?: number) => Promise<ReelsListResponse>;
/**
 * Get reels list with a specific reel first (by ID)
 * Page 1: returns the target reel first, then 2 more reels (3 total)
 * Page 2+: returns 3 reels excluding the target reel
 */
export declare const getReelsListWithIdFirst: (reelId: string, page?: number, limit?: number) => Promise<ReelsListResponse>;
//# sourceMappingURL=reel.service.d.ts.map