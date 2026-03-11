import { HydratedDocument, Types } from 'mongoose';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
export interface Permission {
    _id?: string;
    role: Types.ObjectId;
    section: Section;
    actions: Action[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type PermissionDocument = HydratedDocument<Permission>;
export declare const PermissionModel: import("mongoose").Model<Permission, {}, {}, {}, import("mongoose").Document<unknown, {}, Permission, {}, {}> & Permission & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=permission.model.d.ts.map