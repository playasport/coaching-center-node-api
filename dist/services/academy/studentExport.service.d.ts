export interface ExportFilters {
    centerId?: string;
    batchId?: string;
    status?: 'active' | 'left' | 'completed' | 'pending';
    startDate?: string;
    endDate?: string;
}
/**
 * Export students to Excel
 */
export declare const exportToExcel: (academyUserId: string, filters?: ExportFilters) => Promise<Buffer>;
/**
 * Export students to PDF
 */
export declare const exportToPDF: (academyUserId: string, filters?: ExportFilters) => Promise<Buffer>;
/**
 * Export students to CSV
 */
export declare const exportToCSV: (academyUserId: string, filters?: ExportFilters) => Promise<string>;
//# sourceMappingURL=studentExport.service.d.ts.map