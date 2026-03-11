import { Address } from '../../models/address.model';
export interface EnrolledUser {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    mobile?: string | null;
    profileImage?: string | null;
    userType?: 'student' | 'guardian' | null;
    registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
    address?: Address | null;
    totalBookings: number;
    activeBookings: number;
    totalParticipants: number;
}
export interface GetEnrolledUsersParams {
    centerId?: string;
    batchId?: string;
    userType?: 'student' | 'guardian';
    search?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedEnrolledUsersResult {
    data: EnrolledUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
/**
 * Get all enrolled users for academy (unique users who have enrolled participants)
 */
export declare const getAcademyEnrolledUsers: (userId: string, params?: GetEnrolledUsersParams) => Promise<PaginatedEnrolledUsersResult>;
export interface EnrolledUserDetail {
    user: {
        id: string;
        firstName: string;
        lastName?: string | null;
        email: string;
        mobile?: string | null;
        profileImage?: string | null;
        userType?: 'student' | 'guardian' | null;
        registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
        gender?: string | null;
        dob?: Date | null;
        address?: any | null;
    };
    participants: Array<{
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        gender?: number | null;
        dob?: Date | null;
        schoolName?: string | null;
        contactNumber?: string | null;
        profilePhoto?: string | null;
        disability?: number | null;
        address?: any | null;
    }>;
    totalBookings: number;
    activeBookings: number;
    totalParticipants: number;
}
/**
 * Get detailed information about a specific enrolled user
 */
export declare const getAcademyEnrolledUserDetail: (targetUserId: string, academyUserId: string) => Promise<EnrolledUserDetail>;
//# sourceMappingURL=user.service.d.ts.map