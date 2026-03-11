export interface BatchExportFilters {
    userId?: string;
    centerId?: string;
    sportId?: string;
    status?: string;
    isActive?: boolean;
    /** For agent role: only export batches from centers added by this agent */
    agentUserId?: string;
}
/**
 * Export all batches to Excel with full details
 */
export declare const exportBatchesToExcel: (filters?: BatchExportFilters) => Promise<Buffer>;
//# sourceMappingURL=batchExport.service.d.ts.map