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
    popularSports: PopularSport[];
    popularReels: PopularReel[];
}
/**
 * Get popular sports, fill remaining slots with non-popular sports if needed
 */
export declare const getPopularSports: (limit?: number) => Promise<PopularSport[]>;
/**
 * Get nearby academies based on location
 */
export declare const getNearbyAcademies: (userLocation: {
    latitude: number;
    longitude: number;
}, limit?: number, userId?: string, radius?: number) => Promise<AcademyListItem[]>;
/**
 * Get popular reels sorted by views count
 */
export declare const getPopularReels: (limit?: number) => Promise<PopularReel[]>;
/**
 * Get home page data (nearby academies, popular sports, and popular reels)
 */
export declare const getHomeData: (userLocation?: {
    latitude: number;
    longitude: number;
}, userId?: string, radius?: number) => Promise<HomeData>;
//# sourceMappingURL=home.service.d.ts.map