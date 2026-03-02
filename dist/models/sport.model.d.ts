import { HydratedDocument } from 'mongoose';
export interface Sport {
    custom_id: string;
    name: string;
    slug?: string | null;
    logo?: string | null;
    is_active: boolean;
    is_popular: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type SportDocument = HydratedDocument<Sport>;
export declare const SportModel: import("mongoose").Model<Sport, {}, {}, {}, import("mongoose").Document<unknown, {}, Sport, {}, {}> & Sport & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=sport.model.d.ts.map