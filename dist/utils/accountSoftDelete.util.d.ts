import { User } from '../models/user.model';
export declare const hasRole: (user: Pick<User, "roles"> | {
    roles?: unknown[];
}, roleName: string) => boolean;
/**
 * User app (consumer) login blocked: admin delete, inactive, or per-role user soft-delete.
 */
export declare const assertUserAppCanAuthenticate: (user: User) => void;
/**
 * Academy app login blocked: admin delete, inactive, or per-role academy soft-delete.
 */
export declare const assertAcademyAppCanAuthenticate: (user: User) => void;
//# sourceMappingURL=accountSoftDelete.util.d.ts.map