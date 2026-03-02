import { HydratedDocument } from 'mongoose';
export interface Facility {
    custom_id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type FacilityDocument = HydratedDocument<Facility>;
export declare const FacilityModel: import("mongoose").Model<Facility, {}, {}, {}, import("mongoose").Document<unknown, {}, Facility, {}, {}> & Facility & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=facility.model.d.ts.map