import { HydratedDocument, Types } from 'mongoose';
export interface Certification {
    name: string;
    fileUrl: string;
}
export interface Employee {
    userId: Types.ObjectId;
    fullName: string;
    role: Types.ObjectId;
    mobileNo: string;
    email?: string | null;
    sport?: Types.ObjectId | null;
    center?: Types.ObjectId | null;
    experience?: number | null;
    workingHours?: string | null;
    extraHours?: string | null;
    certification?: Certification[] | null;
    salary?: number | null;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type EmployeeDocument = HydratedDocument<Employee>;
export declare const EmployeeModel: import("mongoose").Model<Employee, {}, {}, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=employee.model.d.ts.map