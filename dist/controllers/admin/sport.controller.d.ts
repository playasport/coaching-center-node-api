import { Request, Response, NextFunction } from 'express';
/**
 * Get all sports for admin
 */
export declare const getAllSports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get sport by ID for admin
 */
export declare const getSportById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a new sport (admin only)
 * Supports image upload via multipart/form-data
 */
export declare const createSport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update sport (admin only)
 * Supports image upload via multipart/form-data
 */
export declare const updateSport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete sport (admin only)
 */
export declare const deleteSport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Toggle sport active status (admin only)
 */
export declare const toggleSportActiveStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete sport image (admin only)
 */
export declare const deleteSportImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export sports to Excel
 */
export declare const exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export sports to PDF
 */
export declare const exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export sports to CSV
 */
export declare const exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=sport.controller.d.ts.map