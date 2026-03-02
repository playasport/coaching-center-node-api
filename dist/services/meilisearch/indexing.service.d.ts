/**
 * Meilisearch Index Names
 */
export declare const MEILISEARCH_INDICES: {
    readonly SPORTS: "sports_index";
    readonly COACHING_CENTRES: "coaching_centres_index";
    readonly REELS: "reels_index";
    readonly LIVE_STREAMS: "live_streams_index";
};
/**
 * Indexing Service for Meilisearch
 * Handles indexing of all models
 */
declare class MeilisearchIndexingService {
    /**
     * Check if indexing is enabled
     */
    private isIndexingEnabled;
    /**
     * Index a single document
     */
    private indexDocument;
    /**
     * Delete a document
     */
    private deleteDocument;
    /**
     * Transform Coaching Center to Meilisearch document
     */
    private transformCoachingCenter;
    /**
     * Transform Sport to Meilisearch document
     */
    private transformSport;
    /**
     * Transform Reel to Meilisearch document
     */
    private transformReel;
    /**
     * Transform Stream Highlight to Meilisearch document
     */
    private transformStreamHighlight;
    /**
     * Index Coaching Center
     */
    indexCoachingCenter(centerId: string): Promise<boolean>;
    /**
     * Update Coaching Center in index
     */
    updateCoachingCenter(centerId: string): Promise<boolean>;
    /**
     * Delete Coaching Center from index
     */
    deleteCoachingCenter(centerId: string): Promise<boolean>;
    /**
     * Index Sport
     */
    indexSport(sportId: string): Promise<boolean>;
    /**
     * Update Sport in index
     */
    updateSport(sportId: string): Promise<boolean>;
    /**
     * Delete Sport from index
     */
    deleteSport(sportId: string): Promise<boolean>;
    /**
     * Index Reel
     */
    indexReel(reelId: string): Promise<boolean>;
    /**
     * Update Reel in index
     */
    updateReel(reelId: string): Promise<boolean>;
    /**
     * Delete Reel from index
     */
    deleteReel(reelId: string): Promise<boolean>;
    /**
     * Index Stream Highlight
     */
    indexStreamHighlight(highlightId: string): Promise<boolean>;
    /**
     * Update Stream Highlight in index
     */
    updateStreamHighlight(highlightId: string): Promise<boolean>;
    /**
     * Delete Stream Highlight from index
     */
    deleteStreamHighlight(highlightId: string): Promise<boolean>;
    /**
     * Re-index all coaching centers
     */
    reindexAllCoachingCenters(): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Re-index all sports
     */
    reindexAllSports(): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Re-index all reels
     */
    reindexAllReels(): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Re-index all stream highlights
     */
    reindexAllStreamHighlights(): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Re-index all indices
     */
    reindexAll(): Promise<{
        coaching_centers: {
            success: number;
            failed: number;
        };
        sports: {
            success: number;
            failed: number;
        };
        reels: {
            success: number;
            failed: number;
        };
        stream_highlights: {
            success: number;
            failed: number;
        };
    }>;
    /**
     * Configure index settings (searchable attributes, filterable attributes, etc.)
     */
    configureIndices(): Promise<boolean>;
}
export declare const meilisearchIndexing: MeilisearchIndexingService;
export {};
//# sourceMappingURL=indexing.service.d.ts.map