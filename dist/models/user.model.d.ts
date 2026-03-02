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
    isDeleted: boolean;
    deletedAt?: Date | null;
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