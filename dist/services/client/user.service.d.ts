import { User, UserDocument } from '../../models/user.model';
import { Address } from '../../models/address.model';
export interface CreateUserData {
    id: string;
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    mobile?: string | null;
    gender?: 'male' | 'female' | 'other';
    dob?: Date | null;
    password: string;
    role: string;
    userType?: 'student' | 'guardian' | null;
    registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
    isActive?: boolean;
}
export interface UpdateUserData {
    firstName?: string;
    middleName?: string | null;
    lastName?: string | null;
    mobile?: string | null;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    dob?: Date | null;
    profileImage?: string | null;
    password?: string;
    role?: string;
    addRole?: boolean;
    userType?: 'student' | 'guardian' | null;
    isActive?: boolean;
    isDeleted?: boolean;
    address?: Partial<Address> | null;
    favoriteSports?: string[];
}
export declare const userService: {
    sanitize(document: User | UserDocument | (User & {
        password?: string;
    }) | null): User | null;
    create(data: CreateUserData): Promise<User>;
    update(id: string, data: UpdateUserData): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<(User & {
        password: string;
    }) | null>;
    findByMobile(mobile: string): Promise<User | null>;
    findByMobileWithPassword(mobile: string): Promise<(User & {
        password: string;
    }) | null>;
    findById(id: string): Promise<User | null>;
    findByIdWithPassword(id: string): Promise<(User & {
        password: string;
    }) | null>;
};
//# sourceMappingURL=user.service.d.ts.map