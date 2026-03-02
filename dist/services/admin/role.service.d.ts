import { Types } from 'mongoose';
/**
 * Get user and academy role IDs with caching (optimized for performance)
 * This is used frequently in user queries, so caching significantly improves performance
 */
export declare const getRoleIds: () => Promise<{
    userRoleId: Types.ObjectId | null;
    academyRoleId: Types.ObjectId | null;
}>;
/**
 * Pre-load role cache on server startup (optional optimization)
 */
export declare const preloadRoleCache: () => Promise<void>;
/**
 * Get all roles visible to the logged-in user based on their role
 * @param userRole - The role ID of the logged-in user
 * @returns Array of roles that the user can view with system-defined flag and user count
 */
export declare const getRolesByUser: (userRole: string) => Promise<any[]>;
/**
 * Get all roles with pagination and metadata (admin only - for internal use)
 * @param page - Page number (default: 1)
 * @param limit - Number of records per page (default: 10)
 * @returns Object with roles array (including isSystemDefined and userCount) and pagination info
 */
export declare const getAllRoles: (page?: number, limit?: number) => Promise<{
    roles: any[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}>;
//# sourceMappingURL=role.service.d.ts.map