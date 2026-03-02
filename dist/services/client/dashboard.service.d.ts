export interface UserDashboardResult {
    total_bookings: number;
    total_participants: number;
    total_bookmarks: number;
    recent_bookings: Array<{
        id: string;
        booking_id: string | null;
        status: string;
        amount: number;
        currency: string;
        payment_status: string;
        batch_name: string;
        center_name: string;
        sport_name: string;
        created_at: Date;
    }>;
}
export declare const getUserDashboard: (userId: string) => Promise<UserDashboardResult>;
//# sourceMappingURL=dashboard.service.d.ts.map