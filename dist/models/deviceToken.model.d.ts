import { HydratedDocument, Types } from 'mongoose';
import { DeviceType } from '../enums/deviceType.enum';
export interface DeviceToken {
    id: string;
    userId: Types.ObjectId;
    fcmToken?: string | null;
    deviceType: DeviceType;
    deviceId?: string | null;
    deviceName?: string | null;
    appVersion?: string | null;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: Date | null;
    isActive: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type DeviceTokenDocument = HydratedDocument<DeviceToken>;
export declare const DeviceTokenModel: import("mongoose").Model<DeviceToken, {}, {}, {}, import("mongoose").Document<unknown, {}, DeviceToken, {}, {}> & DeviceToken & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=deviceToken.model.d.ts.map