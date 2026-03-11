export interface ReelListItem {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    previewUrl: string | null;
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
 * Get paginated list of approved reels
 */
export declare const getReelsList: (page?: number, limit?: number) => Promise<ReelsListResponse>;
/**
 * Get reels list with a specific reel first (by ID)
 * Page 1: returns the target reel first, then 2 more reels (3 total)
 * Page 2+: returns 3 reels excluding the target reel
 */
export declare const getReelsListWithIdFirst: (reelId: string, page?: number, limit?: number) => Promise<ReelsListResponse>;
/**
 * Update reel view count (increment viewsCount)
 */
export declare const updateReelView: (reelId: string) => Promise<number>;
//# sourceMappingURL=reel.service.d.ts.map