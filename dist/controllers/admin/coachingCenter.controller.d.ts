import { Request, Response, NextFunction } from 'express';
/**
 * Get all coaching centers (admin view)
 */
export declare const getAllCoachingCenters: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get coaching center by ID (admin view)
 */
export declare const getCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get coaching centers by user ID (admin view)
 */
export declare const getCoachingCentersByUserId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only) - no role permission required
 */
export declare const listCoachingCentersSimple: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create coaching center by admin
 * Allows admin to create center by providing academy owner details
 */
export declare const createCoachingCenterByAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update coaching center (admin)
 */
export declare const updateCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update coaching center added_by (agent/admin who added the center). Requires coaching_center:update.
 */
export declare const updateCoachingCenterAddedBy: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete coaching center (admin)
 */
export declare const deleteCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Toggle coaching center status (admin)
 */
export declare const toggleStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Remove media from coaching center (admin)
 */
export declare const removeMedia: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get coaching center statistics for admin dashboard
 */
export declare const getCoachingCenterStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Set image as banner for coaching center
 */
export declare const setBannerImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload video thumbnail
 */
export declare const uploadVideoThumbnail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export coaching centers to Excel
 */
export declare const exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export coaching centers to PDF
 */
export declare const exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export coaching centers to CSV
 */
export declare const exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export coaching centers basic details to Excel for bulk update (editable fields only)
 * Use this template to edit and re-import via POST /admin/coaching-centers/import
 */
export declare const exportForBulkUpdate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Import coaching centers basic details from Excel (bulk update)
 * Use export from GET /admin/coaching-centers/export/basic-details first, edit, then upload here.
 * Blank cells = no change.
 */
export declare const importBasicDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Approve or reject coaching center
 */
export declare const updateApprovalStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get coaches (id and name only) for a coaching center.
 * GET /admin/coaching-centers/:id/coach?search=...&page=1&limit=100 (default limit 100)
 */
export declare const getCoaches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a coach (employee) for a coaching center.
 * POST /admin/coaching-centers/:id/coach with body { name: string }
 */
export declare const createCoach: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get employees (coaches) by coaching center ID
 */
export declare const getEmployeesByCoachingCenterId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=coachingCenter.controller.d.ts.map