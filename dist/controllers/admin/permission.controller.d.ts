import { Request, Response } from 'express';
/**
 * Get all permissions
 * Super Admin sees all, others see only their role's permissions
 */
export declare const getPermissions: (req: Request, res: Response) => Promise<void>;
/**
 * Get permission by ID
 */
export declare const getPermissionById: (req: Request, res: Response) => Promise<void>;
/**
 * Create permission (Super Admin only)
 */
export declare const createPermission: (req: Request, res: Response) => Promise<void>;
/**
 * Update permission (Super Admin only)
 */
export declare const updatePermission: (req: Request, res: Response) => Promise<void>;
/**
 * Delete permission (Super Admin only)
 */
export declare const deletePermission: (req: Request, res: Response) => Promise<void>;
/**
 * Get permissions by role
 */
export declare const getPermissionsByRole: (req: Request, res: Response) => Promise<void>;
/**
 * Bulk update permissions for a role (Super Admin only)
 */
export declare const bulkUpdatePermissions: (req: Request, res: Response) => Promise<void>;
/**
 * Get available sections
 */
export declare const getAvailableSections: (_req: Request, res: Response) => Promise<void>;
/**
 * Get available actions
 */
export declare const getAvailableActions: (_req: Request, res: Response) => Promise<void>;
/**
 * Get current user's permissions (simplified format for frontend)
 */
export declare const getMyPermissions: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=permission.controller.d.ts.map