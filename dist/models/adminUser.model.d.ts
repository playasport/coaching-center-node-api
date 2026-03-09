import { HydratedDocument, Types } from 'mongoose';
import { Address } from './address.model';
import { Gender } from '../enums/gender.enum';
export interface AdminUser {
    id: string;
    firstName: string;
    lastName?: string | null;
    dob?: Date | null;
    email: string;
    mobile?: string | null;
    password: string;
    gender?: Gender;
    profileImage?: string | null;
    isActive: boolean;
    roles: Types.ObjectId[];
    agentCode?: string | null;
    address?: Address | null;
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type AdminUserDocument = HydratedDocument<AdminUser>;
export declare const AdminUserModel: import("mongoose").Model<AdminUser, {}, {}, {}, import("mongoose").Document<unknown, {}, AdminUser, {}, {}> & AdminUser & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=adminUser.model.d.ts.map