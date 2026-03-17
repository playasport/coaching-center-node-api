import { AdminUser, AdminUserDocument } from '../../models/adminUser.model';
import { Address } from '../../models/address.model';
import { Types } from 'mongoose';
export interface CreateAdminUserData {
    id: string;
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    mobile?: string | null;
    gender?: 'male' | 'female' | 'other';
    dob?: Date | null;
    password: string;
    roles: Types.ObjectId[];
    isActive?: boolean;
    address?: Address | null;
}
export interface UpdateAdminUserData {
    firstName?: string;
    middleName?: string | null;
    lastName?: string | null;
    mobile?: string | null;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    dob?: Date | null;
    profileImage?: string | null;
    password?: string;
    roles?: Types.ObjectId[];
    isActive?: boolean;
    isDeleted?: boolean;
    address?: Partial<Address> | null;
}
export declare const adminUserService: {
    sanitize(document: AdminUser | AdminUserDocument | (AdminUser & {
        password?: string;
    }) | null): AdminUser | null;
    create(data: CreateAdminUserData): Promise<AdminUser>;
    update(id: string, data: UpdateAdminUserData): Promise<AdminUser | null>;
    findByEmail(email: string): Promise<AdminUser | null>;
    findByEmailWithPassword(email: string): Promise<(AdminUser & {
        password: string;
    }) | null>;
    findByMobile(mobile: string): Promise<AdminUser | null>;
    findByMobileWithPassword(mobile: string): Promise<(AdminUser & {
        password: string;
    }) | null>;
    findById(id: string): Promise<AdminUser | null>;
    findByIdWithPassword(id: string): Promise<(AdminUser & {
        password: string;
    }) | null>;
};
//# sourceMappingURL=adminUser.service.d.ts.map