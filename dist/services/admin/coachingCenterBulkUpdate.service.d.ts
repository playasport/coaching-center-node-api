export interface BulkUpdateExportFilters {
    userId?: string;
    status?: string;
    search?: string;
    sportId?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    approvalStatus?: 'approved' | 'rejected' | 'pending_approval';
}
export interface CoachingCenterBulkImportResult {
    total: number;
    updated: number;
    skipped: number;
    errors: {
        row: number;
        centerId: string;
        message: string;
    }[];
}
export interface CoachingCenterBulkImportOptions {
    currentUserId?: string;
    currentUserRole?: string;
}
/**
 * Export coaching centers to Excel for bulk update (basic details only)
 * Columns: Center ID, Center Name, Email, Age Min, Age Max, Allowed Genders, Allowed Disabled, Only For Disabled,
 * Address Line1, Address Line2, City, State, Country, Pincode, Latitude, Longitude
 */
export declare const exportForBulkUpdateToExcel: (filters?: BulkUpdateExportFilters, currentUserId?: string, currentUserRole?: string) => Promise<Buffer>;
/**
 * Import coaching centers basic details from Excel and bulk update
 * Blank cells = no change. Matches by Center ID (UUID or MongoDB ObjectId).
 */
export declare const importCoachingCenterBasicDetailsFromExcel: (buffer: Buffer, options?: CoachingCenterBulkImportOptions) => Promise<CoachingCenterBulkImportResult>;
//# sourceMappingURL=coachingCenterBulkUpdate.service.d.ts.map