import { Types } from 'mongoose';
import { Permission } from '../../models/permission.model';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
/**
 * Check if a role has a specific permission
 * @param roleId - Role ObjectId or string
 * @param section - Section name
 * @param action - Action name
 * @returns True if permission exists and is active
 */
export declare const hasPermission: (roleId: string | Types.ObjectId, section: Section, action: Action) => Promise<boolean>;
/**
 * Check if a user has a specific permission
 * @param userId - User's string ID
 * @param section - Section name
 * @param action - Action name
 * @returns True if user has permission
 */
export declare const checkPermission: (userId: string, section: Section, action: Action) => Promise<boolean>;
/**
 * Get all permissions for a user
 * @param userId - User's string ID
 * @returns Array of permissions
 */
export declare const getUserPermissions: (userId: string) => Promise<Permission[]>;
/**
 * Get all permissions for a role
 * @param roleId - Role ObjectId or string
 * @returns Array of permissions
 */
export declare const getRolePermissions: (roleId: string | Types.ObjectId) => Promise<Permission[]>;
/**
 * Invalidate permission cache for a role
 * @param roleId - Role ObjectId or string
 */
export declare const invalidatePermissionCache: (roleId: string | Types.ObjectId) => Promise<void>;
/**
 * Invalidate all permission caches
 */
export declare const invalidateAllPermissionCache: () => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closePermissionCache: () => Promise<void>;
//# sourceMappingURL=permission.service.d.ts.map