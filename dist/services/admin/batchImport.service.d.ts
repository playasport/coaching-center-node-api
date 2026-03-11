export interface BatchImportResult {
    total: number;
    updated: number;
    skipped: number;
    errors: {
        row: number;
        _id: string;
        message: string;
    }[];
}
export interface BatchImportOptions {
    /** For agent role: only allow updates to batches from centers added by this agent */
    agentUserId?: string;
}
/**
 * Parse Excel file and bulk update batches
 * Matches batches by _id column
 */
export declare const importBatchesFromExcel: (buffer: Buffer, options?: BatchImportOptions) => Promise<BatchImportResult>;
//# sourceMappingURL=batchImport.service.d.ts.map