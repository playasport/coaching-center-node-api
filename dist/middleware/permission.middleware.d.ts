import { Request, Response, NextFunction } from 'express';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
/**
 * Middleware to require a specific permission
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param action - Action name
 */
export declare const requirePermission: (section: Section, action: Action) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require any of the specified permissions
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param actions - Array of action names (user needs at least one)
 */
export declare const requireAnyPermission: (section: Section, actions: Action[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require all of the specified permissions
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param actions - Array of action names (user needs all)
 */
export declare const requireAllPermissions: (section: Section, actions: Action[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=permission.middleware.d.ts.map