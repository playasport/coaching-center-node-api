import { TransactionStatus, TransactionType, TransactionSource } from '../../models/transaction.model';
export interface TransactionExportFilters {
    userId?: string;
    bookingId?: string;
    status?: TransactionStatus;
    type?: TransactionType;
    source?: TransactionSource;
    search?: string;
    startDate?: string;
    endDate?: string;
}
/**
 * Export transactions to Excel
 */
export declare const exportToExcel: (filters?: TransactionExportFilters) => Promise<Buffer>;
/**
 * Export transactions to CSV
 */
export declare const exportToCSV: (filters?: TransactionExportFilters) => Promise<string>;
/**
 * Export transactions to PDF
 */
export declare const exportToPDF: (filters?: TransactionExportFilters) => Promise<Buffer>;
//# sourceMappingURL=transactionExport.service.d.ts.map