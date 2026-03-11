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
 * Get dashboard statistics (cached for 5 minutes to avoid DB hit on every request)
 */
export declare const getDashboardStats: () => Promise<any>;
//# sourceMappingURL=admin.service.d.ts.map