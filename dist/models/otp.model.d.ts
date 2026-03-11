import { HydratedDocument } from 'mongoose';
import { OtpMode } from '../enums/otpMode.enum';
import { OtpChannel } from '../enums/otpChannel.enum';
export { OtpMode, OtpChannel };
export interface Otp {
    id: string;
    identifier: string;
    channel: OtpChannel;
    mobile?: string | null;
    otp: string;
    mode: OtpMode;
    expiresAt: Date;
    consumed: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type OtpDocument = HydratedDocument<Otp>;
export declare const OtpModel: import("mongoose").Model<Otp, {}, {}, {}, import("mongoose").Document<unknown, {}, Otp, {}, {}> & Otp & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=otp.model.d.ts.map