/**
 * Adds explicit flags for admin UI (list/detail) alongside raw timestamps.
 */
export declare function mapUserDeletionFieldsForAdmin<T extends Record<string, unknown>>(user: T | null): (T & {
    accountDeleted: boolean;
    userRoleSoftDeleted: boolean;
    academyRoleSoftDeleted: boolean;
}) | null;
/**
 * Clears global soft-delete, per-role soft-delete, reactivates account and owned centers/batches (mirrors academy soft-delete cascade).
 */
export declare function enableClientUserAccount(idParam: string): Promise<Record<string, unknown>>;
//# sourceMappingURL=clientUserAdmin.service.d.ts.map