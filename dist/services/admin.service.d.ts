/**
 * Get all available sections
 */
export declare const getAllSections: () => Array<{
    value: string;
    label: string;
}>;
/**
 * Get all available actions
 */
export declare const getAllActions: () => Array<{
    value: string;
    label: string;
}>;
/**
 * Get dashboard statistics
 */
export declare const getDashboardStats: () => Promise<{
    users: {
        total: number;
        active: number;
        inactive: number;
    };
    coachingCenters: {
        total: number;
        active: number;
        inactive: number;
    };
    bookings: {
        total: number;
        pending: number;
        completed: number;
    };
    batches: {
        total: number;
        active: number;
        inactive: number;
    };
    employees: {
        total: number;
        active: number;
        inactive: number;
    };
    students: {
        total: number;
    };
    participants: {
        total: number;
    };
}>;
//# sourceMappingURL=admin.service.d.ts.map