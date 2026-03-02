import { Request, Response } from 'express';
/**
 * Get all roles (admin - Super Admin only)
 */
export declare const getAllRoles: (req: Request, res: Response) => Promise<void>;
/**
 * Get role by ID (admin - Super Admin only)
 */
export declare const getRoleById: (req: Request, res: Response) => Promise<void>;
/**
 * Create role (admin - Super Admin only)
 */
export declare const createRole: (req: Request, res: Response) => Promise<void>;
/**
 * Update role (admin - Super Admin only)
 */
export declare const updateRole: (req: Request, res: Response) => Promise<void>;
/**
 * Delete role (admin - Super Admin only)
 */
export declare const deleteRole: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=role.controller.d.ts.map