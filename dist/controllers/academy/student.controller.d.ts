import { Request, Response, NextFunction } from 'express';
/**
 * Get enrolled students for academy
 */
export declare const getEnrolledStudents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get enrolled student detail by participant ID
 */
export declare const getEnrolledStudentDetail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled students to Excel
 */
export declare const exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled students to PDF
 */
export declare const exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export enrolled students to CSV
 */
export declare const exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=student.controller.d.ts.map