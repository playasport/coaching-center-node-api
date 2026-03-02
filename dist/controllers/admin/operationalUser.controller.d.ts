import { Request, Response, NextFunction } from 'express';
/**
 * Create operational user (any role except user/academy/super_admin)
 */
export declare const createOperationalUser: (req: Request, res: Response) => Promise<void>;
/**
 * Get all operational users (excluding user/academy/super_admin)
 */
export declare const getAllOperationalUsers: (req: Request, res: Response) => Promise<void>;
/**
 * Get operational user by ID
 */
export declare const getOperationalUser: (req: Request, res: Response) => Promise<void>;
/**
 * Update operational user
 * Super admin can update email and password
 */
export declare const updateOperationalUser: (req: Request, res: Response) => Promise<void>;
/**
 * Delete operational user (soft delete)
 */
export declare const deleteOperationalUser: (req: Request, res: Response) => Promise<void>;
/**
 * Export agent coaching centres to Excel.
 * GET /admin/operational-users/:id/agent-coaching-export?period=...&startDate=&endDate=
 * Only for users with agent role. period: today | this_week | this_month | last_month | all_time | custom.
 * For custom, startDate and endDate (YYYY-MM-DD) required.
 */
export declare const exportAgentCoachingExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=operationalUser.controller.d.ts.map