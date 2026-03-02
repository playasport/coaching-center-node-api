import { BookingStatus } from '../../models/booking.model';
import { PaymentStatus } from '../../models/booking.model';
export interface EnrolledStudent {
    participant: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        gender?: number | null;
        dob?: Date | null;
        age?: number | null;
        schoolName?: string | null;
        contactNumber?: string | null;
        profilePhoto?: string | null;
    };
    user: {
        id: string;
        firstName: string;
        lastName?: string | null;
        email: string;
        mobile?: string | null;
    };
    batches: Array<{
        batchId: string;
        batchName: string;
        sport: {
            id: string;
            name: string;
        };
        center: {
            id: string;
            name: string;
        };
        bookingId: string;
        bookingStatus: BookingStatus;
        paymentStatus: PaymentStatus;
        enrolledDate: Date;
        amount: number;
    }>;
    overallStatus: 'active' | 'left' | 'completed' | 'pending';
    totalEnrollments: number;
    activeEnrollments: number;
}
export interface GetEnrolledStudentsParams {
    centerId?: string;
    batchId?: string;
    status?: 'active' | 'left' | 'completed' | 'pending';
    page?: number;
    limit?: number;
}
export interface PaginatedEnrolledStudentsResult {
    data: EnrolledStudent[];
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
 * Get all enrolled students for academy (grouped by participant, no duplicates)
 */
export declare const getAcademyEnrolledStudents: (userId: string, params?: GetEnrolledStudentsParams) => Promise<PaginatedEnrolledStudentsResult>;
export interface EnrolledStudentDetail {
    participant: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        gender?: number | null;
        dob?: Date | null;
        age?: number | null;
        schoolName?: string | null;
        contactNumber?: string | null;
        profilePhoto?: string | null;
        disability?: number | null;
        address?: any | null;
    };
    user: {
        id: string;
        firstName: string;
        lastName?: string | null;
        email: string;
        mobile?: string | null;
        profileImage?: string | null;
    };
    batches: Array<{
        batch: {
            id: string;
            name: string;
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
            fee_structure?: any;
            status: string;
        };
        sport: {
            id: string;
            name: string;
            logo?: string | null;
        };
        center: {
            id: string;
            center_name: string;
            email?: string | null;
            mobile_number?: string | null;
            logo?: string | null;
            location?: {
                latitude: number;
                longitude: number;
                address: any;
            } | null;
        };
        booking: {
            id: string;
            status: BookingStatus;
            payment: {
                status: PaymentStatus;
                amount: number;
                currency: string;
                payment_method?: string | null;
                paid_at?: Date | null;
            };
            amount: number;
            currency: string;
            notes?: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        enrolledDate: Date;
    }>;
    overallStatus: 'active' | 'left' | 'completed' | 'pending';
    totalEnrollments: number;
    activeEnrollments: number;
}
/**
 * Get detailed information about a specific enrolled student
 */
export declare const getAcademyEnrolledStudentDetail: (participantId: string, userId: string) => Promise<EnrolledStudentDetail>;
//# sourceMappingURL=student.service.d.ts.map