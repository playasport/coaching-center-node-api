export interface SportExportFilters {
    search?: string;
    isActive?: boolean;
    isPopular?: boolean;
    startDate?: string;
    endDate?: string;
}
/**
 * Export sports to Excel
 */
export declare const exportToExcel: (filters?: SportExportFilters) => Promise<Buffer>;
/**
 * Export sports to PDF
 */
export declare const exportToPDF: (filters?: SportExportFilters) => Promise<Buffer>;
/**
 * Export sports to CSV
 */
export declare const exportToCSV: (filters?: SportExportFilters) => Promise<string>;
//# sourceMappingURL=sportExport.service.d.ts.map