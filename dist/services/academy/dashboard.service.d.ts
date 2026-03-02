export interface DashboardStats {
    total_users: number;
    total_students: number;
    total_bookings: number;
    total_active_batches: number;
    total_earnings: number;
    monthly_earnings: Array<{
        month: string;
        earnings: number;
    }>;
    recent_bookings: Array<{
        id: string;
        booking_id: string | null;
        student_name: string;
        batch_name: string;
        sport_name: string;
        booking_time: Date;
        booking_status: string;
    }>;
}
/**
 * Get academy dashboard statistics
 */
export declare const getAcademyDashboard: (academyUserId: string) => Promise<DashboardStats>;
//# sourceMappingURL=dashboard.service.d.ts.map