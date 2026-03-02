import { Schema } from 'mongoose';
export interface Address {
    line1?: string | null;
    line2: string;
    area?: string | null;
    city: string;
    state: string;
    country: string;
    pincode: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const addressSchema: Schema<Address, import("mongoose").Model<Address, any, any, any, import("mongoose").Document<unknown, any, Address, any, {}> & Address & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Address, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Address>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Address> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=address.model.d.ts.map