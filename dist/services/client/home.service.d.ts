import type { AcademyListItem } from './academy.service';
export interface PopularSport {
    _id: string;
    custom_id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    is_popular: boolean;
}
export interface PopularReel {
    id: string;
    videoUrl: string;
    videoPreviewUrl: string;
    thumbnailUrl: string;
    title: string;
    description: string | null;
    user: {
        name: string;
        avatar: string | null;
    };
    likes: number;
    views: number;
    comments: number;
}
export interface HomeData {
    nearbyAcademies: AcademyListItem[];
    recommendedAcademies: AcademyListItem[];
    sportsWiseAcademies: SportWiseAcademy[];
    popularSports: PopularSport[];
    popularReels: PopularReel[];
    topCities: TopCity[];
}
/**
 * Get popular sports, fill remaining slots with non-popular sports if needed
 */
export declare const getPopularSports: (limit?: number) => Promise<PopularSport[]>;
/**
 * Get nearby academies based on location
 * Flow: MongoDB $geoNear (top 200) → Redis/Google road distance → final sorted result
 * Fallback: bounding box + calculateDistances when location.geo not populated
 */
export declare const getNearbyAcademies: (userLocation: {
    latitude: number;
    longitude: number;
}, limit?: number, userId?: string, radius?: number) => Promise<AcademyListItem[]>;
/**
 * Get recommended academies based on user location and favorite sports
 * Only returns results when user is logged in with favorite sports and location is provided
 */
export declare const getRecommendedAcademies: (userLocation: {
    latitude: number;
    longitude: number;
}, limit?: number, userId?: string, radius?: number) => Promise<AcademyListItem[]>;
/**
 * Get popular reels sorted by views count
 */
export declare const getPopularReels: (limit?: number) => Promise<PopularReel[]>;
export interface TopCity {
    city: string;
    state: string;
    academyCount: number;
}
export interface SportWiseAcademy {
    sport: {
        id: string;
        custom_id: string;
        name: string;
        slug: string | null;
        logo: string | null;
        is_popular: boolean;
    };
    academies: AcademyListItem[];
}
/**
 * Get top 10 cities with the most academies
 * Only counts approved, active, non-deleted academies
 */
export declare const getTopCities: (limit?: number) => Promise<TopCity[]>;
/**
 * Get sports-wise academies: max 18 academies per sport for 5 sports.
 * When user is logged in, favorite sports appear first; otherwise only popular sports.
 * Requires user location.
 */
export declare const getSportsWiseAcademies: (userLocation: {
    latitude: number;
    longitude: number;
}, userId?: string, radius?: number) => Promise<SportWiseAcademy[]>;
/**
 * Get home page data (nearby academies, recommended academies, popular sports, and popular reels)
 * Uses Redis cache (5 min TTL) when same user + same location to avoid repeated DB calls
 */
export declare const getHomeData: (userLocation?: {
    latitude: number;
    longitude: number;
}, userId?: string, radius?: number) => Promise<HomeData>;
//# sourceMappingURL=home.service.d.ts.map