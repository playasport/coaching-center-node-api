export interface HighlightListItem {
    id: string;
    thumbnail: string;
    title: string;
    viewers: number;
    createdAt: Date;
}
export interface HighlightsListResponse {
    highlights: HighlightListItem[];
    total: number;
    current_page: number;
    total_pages: number;
    limit: number;
}
export interface HighlightDetailResponse {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    playLink: string;
    views: number;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        logo: string | null;
    } | null;
    sports: {
        id: string;
        name: string;
        logo: string | null;
    }[];
    coachingCenter: {
        id: string;
        name: string;
        logo: string | null;
    } | null;
}
/**
 * Get paginated list of published highlights (minimal data)
 */
export declare const getHighlightsList: (page?: number, limit?: number) => Promise<HighlightsListResponse>;
/**
 * Get highlight details by ID
 */
export declare const getHighlightById: (highlightId: string) => Promise<HighlightDetailResponse>;
/**
 * Update highlight view count (increment viewsCount)
 */
export declare const updateHighlightView: (highlightId: string) => Promise<number>;
//# sourceMappingURL=highlight.service.d.ts.map