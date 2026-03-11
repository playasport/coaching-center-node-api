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
export interface AcademyListItem {
    _id: string;
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
        _id: string;
        custom_id: string;
        name: string;
        logo?: string | null;
        is_popular: boolean;
    }>;
    age: {
        min: number;
        max: number;
    };
    allowed_genders: string[];
    distance?: number;
}
export interface AcademyDetail extends AcademyListItem {
    mobile_number?: string | null;
    email?: string | null;
    rules_regulation?: string[] | null;
    sport_details: Array<{
        sport_id: {
            _id: string;
            custom_id: string;
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
        _id: string;
        custom_id: string;
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
        _id: string;
        name: string;
        sport: {
            _id: string;
            custom_id: string;
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
    }>;
}
/**
 * Get all academies with pagination, location-based sorting, and favorite sports preference
 */
export declare const getAllAcademies: (page?: number, limit?: number, userLocation?: {
    latitude: number;
    longitude: number;
}, userId?: string, radius?: number) => Promise<PaginatedResult<AcademyListItem>>;
/**
 * Get academy by ID - supports multiple ID types:
 * 1. MongoDB ObjectId (_id) - 24 hex characters
 * 2. CoachingCenter UUID (id field) - UUID format
 * 3. User custom ID - searches by user's custom ID
 */
export declare const getAcademyById: (id: string, isUserLoggedIn?: boolean) => Promise<AcademyDetail | null>;
/**
 * Get academies by city name
 */
export declare const getAcademiesByCity: (cityName: string, page?: number, limit?: number) => Promise<PaginatedResult<AcademyListItem>>;
/**
 * Get academies by sport slug
 */
export declare const getAcademiesBySport: (sportSlug: string, page?: number, limit?: number, userLocation?: {
    latitude: number;
    longitude: number;
}, radius?: number) => Promise<PaginatedResult<AcademyListItem>>;
//# sourceMappingURL=academy.service.d.ts.map