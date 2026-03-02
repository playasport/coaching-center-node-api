export interface ExportFilters {
    userId?: string;
    status?: string;
    search?: string;
    sportId?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    isApproved?: boolean;
    approvalStatus?: 'approved' | 'rejected' | 'pending_approval';
}
/**
 * Export coaching centers to Excel
 */
export declare const exportToExcel: (filters?: ExportFilters, currentUserId?: string, currentUserRole?: string) => Promise<Buffer>;
/**
 * Export coaching centers to PDF
 */
export declare const exportToPDF: (filters?: ExportFilters, currentUserId?: string, currentUserRole?: string) => Promise<Buffer>;
/**
 * Export coaching centers to CSV
 */
export declare const exportToCSV: (filters?: ExportFilters, currentUserId?: string, currentUserRole?: string) => Promise<string>;
//# sourceMappingURL=coachingCenterExport.service.d.ts.map