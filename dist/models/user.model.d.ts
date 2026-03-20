import { HydratedDocument, Types } from 'mongoose';
import { Address } from './address.model';
import { Gender } from '../enums/gender.enum';
export type RegistrationMethod = 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram';
export interface AcademyDetails {
    name: string;
}
export interface User {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    dob?: Date | null;
    email: string;
    mobile?: string | null;
    password: string;
    gender?: Gender;
    profileImage?: string | null;
    isActive: boolean;
    roles: Types.ObjectId[];
    userType?: 'student' | 'guardian' | null;
    registrationMethod?: RegistrationMethod | null;
    favoriteSports?: Types.ObjectId[];
    address?: Address | null;
    academyDetails?: AcademyDetails | null;
    referredByAgent?: Types.ObjectId | null;
    referredByAgentAt?: Date | null;
    isDeleted: boolean;
    deletedAt?: Date | null;
    /** Soft-delete for consumer (`user` role) only; academy login may still work. */
    userRoleDeletedAt?: Date | null;
    /** Soft-delete for academy role only; user-app login may still work. */
    academyRoleDeletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type UserDocument = HydratedDocument<User>;
export declare const UserModel: import("mongoose").Model<User, {}, {}, {}, import("mongoose").Document<unknown, {}, User, {}, {}> & User & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=user.model.d.ts.map