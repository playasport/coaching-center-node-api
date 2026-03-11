/**
 * Get all roles visible to the logged-in user based on their role
 * @param userRole - The role ID of the logged-in user
 * @returns Array of roles that the user can view
 */
export declare const getRolesByUser: (userRole: string) => Promise<any[]>;
/**
 * Get all roles (admin only - for internal use)
 */
export declare const getAllRoles: () => Promise<any[]>;
//# sourceMappingURL=role.service.d.ts.map