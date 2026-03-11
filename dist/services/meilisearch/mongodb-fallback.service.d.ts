/**
 * MongoDB Fallback Search Service
 * Provides same response format as Meilisearch when Meilisearch is disabled
 */
declare class MongodbFallbackService {
    /**
     * Search Coaching Centers from MongoDB
     * @param query - Search text
     * @param options - size, from, lat/long, radius, and filters: city, state, sportId, sportIds (comma-separated), gender
     */
    searchCoachingCenters(query: string, options?: {
        size?: number;
        from?: number;
        latitude?: number | null;
        longitude?: number | null;
        /** Max distance in km (only when lat/long provided). Omit or 0 = no limit; results sorted by distance. */
        radius?: number;
        /** Filter by city (location.address.city), case-insensitive partial match */
        city?: string;
        /** Filter by state (location.address.state), case-insensitive partial match */
        state?: string;
        /** Filter by sport – centers that offer this sport (single ID) */
        sportId?: string;
        /** Filter by sports – centers that offer any of these sports (comma-separated IDs) */
        sportIds?: string;
        /** Filter by allowed gender: male | female | other */
        gender?: string;
        /** Filter for persons with disability – only centers where allowed_disabled is true */
        forDisabled?: boolean;
        /** Filter by age range – minimum age (years). Centers whose age range overlaps [minAge, maxAge] are included. */
        minAge?: number;
        /** Filter by age range – maximum age (years). Centers whose age range overlaps [minAge, maxAge] are included. */
        maxAge?: number;
        /** Filter by minimum average rating (0-5). Only centers with averageRating >= minRating are returned. */
        minRating?: number;
        /** When true and lat/long provided, sort by nearest first (default true when lat/long present) */
        sortByDistance?: boolean;
    }): Promise<any>;
    /**
     * Search Sports from MongoDB
     */
    searchSports(query: string, options?: {
        size?: number;
        from?: number;
    }): Promise<any>;
    /**
     * Search Reels from MongoDB
     */
    searchReels(query: string, options?: {
        size?: number;
        from?: number;
    }): Promise<any>;
    /**
     * Search Stream Highlights from MongoDB
     */
    searchStreamHighlights(query: string, options?: {
        size?: number;
        from?: number;
    }): Promise<any>;
}
export declare const mongodbFallback: MongodbFallbackService;
export {};
//# sourceMappingURL=mongodb-fallback.service.d.ts.map