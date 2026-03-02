import { HydratedDocument } from 'mongoose';
import { DefaultRoles } from '../enums/defaultRoles.enum';
export interface Role {
    _id?: string;
    name: string;
    description?: string | null;
    visibleToRoles?: string[] | null;
    createdAt: Date;
    updatedAt: Date;
}
export type RoleDocument = HydratedDocument<Role>;
export { DefaultRoles };
export declare const RoleModel: import("mongoose").Model<Role, {}, {}, {}, import("mongoose").Document<unknown, {}, Role, {}, {}> & Role & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=role.model.d.ts.map