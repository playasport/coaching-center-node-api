export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface PaginatedResultWithSport<T> extends PaginatedResult<T> {
    sport: {
        id: string;
        name: string;
        logo?: string | null;
    };
}
export interface AcademyListItem {
    id: string;
    center_name: string;
    logo?: string | null;
    image?: string | null;
    location: {
        latitude: number;
        longitude: number;
        address: {
            line1?: string | null;
            line2: string;
            city: string;
            state: string;
            country?: string | null;
            pincode: string;
        };
    };
    sports: Array<{
        id: string;
        name: string;
        logo?: string | null;
        is_popular: boolean;
    }>;
    allowed_genders: string[];
    age?: {
        min: number;
        max: number;
    };
    allowed_disabled?: boolean;
    is_only_for_disabled?: boolean;
    distance?: number;
    averageRating?: number;
    totalRatings?: number;
    isBookmarked?: boolean;
}
/** Single rating item as returned in academy detail (latest 5). */
export interface AcademyRatingItem {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: Date;
    user?: {
        id: string;
        firstName: string;
        lastName?: string | null;
        profileImage?: string | null;
    } | null;
}
export interface AcademyDetail extends AcademyListItem {
    share_url?: string;
    mobile_number?: string | null;
    email?: string | null;
    rules_regulation?: string[] | null;
    /** Latest 5 ratings; if user is logged in and has rated, their rating appears first */
    ratings: AcademyRatingItem[];
    /** Whether the current user has already rated this center (only when logged in) */
    isAlreadyRated: boolean;
    /** Whether the current user can update their rating (true if they have rated; only when logged in) */
    canUpdateRating: boolean;
    /** Whether the current user has bookmarked this center (only when logged in) */
    isBookmarked: boolean;
    sport_details: Array<{
        sport_id: {
            id: string;
            name: string;
            logo?: string | null;
            is_popular: boolean;
        };
        description: string;
        images: Array<{
            unique_id: string;
            url: string;
            is_active: boolean;
        }>;
        videos: Array<{
            unique_id: string;
            url: string;
            thumbnail?: string | null;
            is_active: boolean;
        }>;
    }>;
    facility: Array<{
        id: string;
        name: string;
        description?: string | null;
        icon?: string | null;
    }>;
    operational_timing: {
        operating_days: string[];
        opening_time: string;
        closing_time: string;
    };
    allowed_genders: string[];
    allowed_disabled: boolean;
    is_only_for_disabled: boolean;
    experience: number;
    batches?: Array<{
        id: string;
        name: string;
        sport: {
            id: string;
            name: string;
            logo?: string | null;
        };
        scheduled: {
            start_date: Date;
            start_time: string;
            end_time: string;
            training_days: string[];
        };
        duration: {
            count: number;
            type: string;
        };
        capacity: {
            min: number;
            max?: number | null;
        };
        age: {
            min: number;
            max: number;
        };
        admission_fee?: number | null;
        fee_structure?: {
            fee_type: string;
            fee_configuration: Record<string, any>;
            admission_fee?: number | null;
        } | null;
        status: string;
        is_active: boolean;
        description?: string | null;
    }>;
}
/** Filter options for get all academies (same as search API) */
export interface GetAllAcademiesFilters {
    city?: string;
    state?: string;
    sportId?: string;
    sportIds?: string;
    gender?: string;
    forDisabled?: boolean;
    minAge?: number;
    maxAge?: number;
    minRating?: number;
}
/**
 * Get all academies with pagination, location-based sorting, and favorite sports preference
 * Optimized to use database-level filtering and limit records fetched.
 * Supports same filters as search API: city, state, sportId, sportIds, gender, for_disabled, min_age, max_age.
 */
export declare const getAllAcademies: (page?: number, limit?: number, userLocation?: {
    latitude: number;
    longitude: number;
}, userId?: string, radius?: number, filters?: GetAllAcademiesFilters) => Promise<PaginatedResult<AcademyListItem>>;
/**
 * Get academy by ID - supports multiple ID types:
 * 1. MongoDB ObjectId (_id) - 24 hex characters
 * 2. CoachingCenter UUID (id field) - UUID format
 * 3. User custom ID - searches by user's custom ID
 * When userId is provided, response includes latest 5 ratings with that user's rating first (if any), and isAlreadyRated/canUpdateRating.
 * When userLocation is provided, returns distance in km from user to academy.
 */
export declare const getAcademyById: (id: string, isUserLoggedIn?: boolean, userId?: string | null, userLocation?: {
    latitude: number;
    longitude: number;
}) => Promise<AcademyDetail | null>;
/**
 * Get academies by city name
 */
export declare const getAcademiesByCity: (cityName: string, page?: number, limit?: number, userId?: string) => Promise<PaginatedResult<AcademyListItem>>;
/**
 * Get academies by sport slug
 */
export declare const getAcademiesBySport: (sportSlug: string, page?: number, limit?: number, userLocation?: {
    latitude: number;
    longitude: number;
}, radius?: number, userId?: string) => Promise<PaginatedResultWithSport<AcademyListItem>>;
//# sourceMappingURL=academy.service.d.ts.map