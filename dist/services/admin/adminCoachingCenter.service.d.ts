import { CoachingCenter } from '../../models/coachingCenter.model';
import type { AdminCoachingCenterCreateInput } from '../../validations/coachingCenter.validation';
/** Supported date range keys for filtering by createdAt */
export type DateRangeFilterKey = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';
/**
 * Get start and end UTC dates for a date range key.
 * All boundaries are in UTC (start of day 00:00:00.000, end of day 23:59:59.999).
 * this_week = Monday 00:00 to Sunday 23:59:59 of current week (ISO week).
 * this_month = 1st 00:00 to last day 23:59:59 of current month.
 */
export declare const getDateRangeForKey: (key: DateRangeFilterKey) => {
    start: Date;
    end: Date;
};
export interface AdminPaginatedResult<T> {
    coachingCenters: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CoachingCenterListItem {
    _id: string;
    id: string;
    center_name: string;
    email: string;
    mobile_number: string;
    logo: string | null;
    status: string;
    is_active: boolean;
    approval_status: 'approved' | 'rejected' | 'pending_approval';
    reject_reason?: string | null;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
    };
    added_by: string | null;
    sports: Array<{
        id: string;
        name: string;
    }>;
    location: {
        latitude: number;
        longitude: number;
        address: {
            line1: string | null;
            line2: string;
            city: string;
            state: string;
            country: string | null;
            pincode: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface CoachingCenterStats {
    total: number;
    byStatus: Record<string, number>;
    byActiveStatus: {
        active: number;
        inactive: number;
    };
    byApprovalStatus: {
        approved: number;
        rejected: number;
        pending_approval: number;
    };
    bySport: Record<string, number>;
    byCity: Record<string, number>;
    byState: Record<string, number>;
    allowingDisabled: number;
    onlyForDisabled: number;
    onlyForFemale: number;
}
/**
 * Get all coaching centers for admin view with filters
 */
export declare const getAllCoachingCenters: (page?: number, limit?: number, filters?: {
    userId?: string;
    status?: string;
    search?: string;
    sportId?: string;
    isActive?: boolean;
    isApproved?: boolean;
    approvalStatus?: "approved" | "rejected" | "pending_approval";
    addedById?: string;
    onlyForFemale?: boolean;
    allowingDisabled?: boolean;
    onlyForDisabled?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    /** Filter by createdAt: today, yesterday, this_week, this_month, last_7_days, last_30_days */
    dateRange?: DateRangeFilterKey;
}, currentUserId?: string, currentUserRole?: string) => Promise<AdminPaginatedResult<CoachingCenterListItem>>;
/**
 * Get coaching centers by academy owner ID for admin
 */
export declare const getCoachingCentersByUserId: (userId: string, page?: number, limit?: number, sortBy?: string, sortOrder?: "asc" | "desc", currentUserId?: string, currentUserRole?: string) => Promise<AdminPaginatedResult<CoachingCenter>>;
/**
 * Get coaching center by ID for admin with agent filtering
 * @param centerId - Coaching center ID
 * @param currentUserId - Current admin user ID (for agent filtering)
 * @param currentUserRole - Current admin user role (for agent filtering)
 */
export declare const getCoachingCenterByIdForAdmin: (centerId: string, currentUserId?: string, currentUserRole?: string) => Promise<CoachingCenter | null>;
/**
 * Create coaching center by admin on behalf of a user
 * @param data - Coaching center data
 * @param adminUserId - ID of the admin user creating this center (optional)
 */
export declare const createCoachingCenterByAdmin: (data: AdminCoachingCenterCreateInput, adminUserId?: string) => Promise<CoachingCenter>;
/**
 * Update coaching center by admin
 */
export declare const updateCoachingCenterByAdmin: (id: string, data: any) => Promise<CoachingCenter | null>;
/**
 * Update only the addedBy (agent/admin) for a coaching center. Uses same access rules as get (agents only their centers).
 */
export declare const updateCoachingCenterAddedBy: (centerId: string, addedById: string | null | undefined, currentUserId?: string, currentUserRole?: string) => Promise<CoachingCenter | null>;
/**
 * Get coaching center statistics for admin dashboard
 */
export declare const getCoachingCenterStats: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    status?: string;
    isActive?: boolean;
    isApproved?: boolean;
    approvalStatus?: "approved" | "rejected" | "pending_approval";
    sportId?: string;
    search?: string;
}, currentUserId?: string, currentUserRole?: string) => Promise<CoachingCenterStats>;
/**
 * Approve or reject coaching center
 * Only super_admin and admin can approve/reject
 */
export declare const updateApprovalStatus: (id: string, isApproved: boolean, rejectReason?: string, currentUserRole?: string) => Promise<CoachingCenter | null>;
/**
 * Get employees (coaches) by coaching center ID
 */
export declare const getEmployeesByCoachingCenterId: (coachingCenterId: string, page?: number, limit?: number, roleName?: string, search?: string) => Promise<AdminPaginatedResult<any>>;
/**
 * Get coaches (employees with role 'coach') for a coaching center.
 * Returns only id and name. Supports search by name. Default limit 100.
 */
export declare const getCoachesListByCoachingCenterId: (coachingCenterId: string, search?: string, page?: number, limit?: number) => Promise<{
    coaches: Array<{
        id: string;
        name: string;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
/**
 * Create a coach (employee) for a coaching center.
 * Accepts only name and coaching center ID (from URL). Uses the coaching center's owner (user) as the employee's userId.
 */
export declare const createCoachForCoachingCenter: (coachingCenterId: string, name: string) => Promise<any>;
/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only)
 * Includes Redis caching for improved performance
 */
export declare const listCoachingCentersSimple: (page?: number, limit?: number, search?: string, status?: string, isActive?: boolean, centerId?: string, currentUserId?: string, currentUserRole?: string) => Promise<AdminPaginatedResult<{
    id: string;
    center_name: string;
} | {
    id: string;
    center_name: string;
    sport_details: Array<{
        id: string;
        name: string;
    }>;
}>>;
//# sourceMappingURL=adminCoachingCenter.service.d.ts.map