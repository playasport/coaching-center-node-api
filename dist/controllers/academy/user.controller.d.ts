import { Request, Response, NextFunction } from 'express';
/**
 * Get enrolled users for academy
 */
export declare const getEnrolledUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get enrolled user detail by user ID
 */
export declare const getEnrolledUserDetail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled users to Excel
 */
export declare const exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled users to PDF
 */
export declare const exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled users to CSV
 */
export declare const exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map