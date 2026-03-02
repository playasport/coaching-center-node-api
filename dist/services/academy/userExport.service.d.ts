export interface ExportFilters {
    centerId?: string;
    batchId?: string;
    userType?: 'student' | 'guardian';
    search?: string;
    startDate?: string;
    endDate?: string;
}
/**
 * Export users to Excel
 */
export declare const exportToExcel: (academyUserId: string, filters?: ExportFilters) => Promise<Buffer>;
/**
 * Export users to PDF
 */
export declare const exportToPDF: (academyUserId: string, filters?: ExportFilters) => Promise<Buffer>;
/**
 * Export users to CSV
 */
export declare const exportToCSV: (academyUserId: string, filters?: ExportFilters) => Promise<string>;
//# sourceMappingURL=userExport.service.d.ts.map