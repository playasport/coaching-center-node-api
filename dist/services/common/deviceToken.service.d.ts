import { Types } from 'mongoose';
import { DeviceTokenAppContext } from '../../models/deviceToken.model';
import { DeviceType } from '../../enums/deviceType.enum';
export interface RegisterDeviceTokenData {
    userId: Types.ObjectId | string;
    appContext?: DeviceTokenAppContext | null;
    fcmToken?: string | null;
    deviceType: DeviceType;
    deviceId?: string | null;
    deviceName?: string | null;
    appVersion?: string | null;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: Date | null;
}
export interface UpdateDeviceTokenData {
    fcmToken?: string;
    deviceName?: string | null;
    appVersion?: string | null;
    isActive?: boolean;
}
export declare const deviceTokenService: {
    /**
     * Register or update a device token for a user
     * If deviceId is provided and a token exists for that device, it will be updated
     * Otherwise, a new token will be created
     */
    registerOrUpdateDeviceToken(data: RegisterDeviceTokenData): Promise<void>;
    /**
     * Get all active device tokens for a user
     * @param appContext - When 'user' or 'academy', only returns tokens from that app. Prevents user notifications reaching academy app on same device.
     */
    getUserDeviceTokens(userId: string | Types.ObjectId, appContext?: DeviceTokenAppContext | null): Promise<any[]>;
    /**
     * Deactivate a device token (mark as inactive)
     * Supports both MongoDB ObjectId and custom UUID string
     */
    deactivateDeviceToken(userId: string | Types.ObjectId, deviceId?: string, fcmToken?: string): Promise<void>;
    /**
     * Deactivate all device tokens for a user (logout from all devices)
     */
    deactivateAllDeviceTokens(userId: string | Types.ObjectId): Promise<void>;
    /**
     * Find device token by refresh token
     */
    findDeviceByRefreshToken(refreshToken: string): Promise<any | null>;
    /**
     * Update refresh token for a device
     */
    updateDeviceRefreshToken(deviceId: string, refreshToken: string, expiresAt: Date): Promise<void>;
    /**
     * Revoke refresh token for a specific device
     * Supports both MongoDB ObjectId and custom UUID string
     */
    revokeDeviceRefreshToken(userId: string | Types.ObjectId, deviceId?: string, refreshToken?: string): Promise<void>;
    /**
     * Physically delete a device token from the database
     * Supports both MongoDB ObjectId and custom UUID string
     */
    deleteDeviceToken(userId: string | Types.ObjectId, deviceId?: string, refreshToken?: string): Promise<boolean>;
    /**
     * Physically delete all device tokens for a user from the database
     */
    deleteAllDeviceTokensForUser(userId: string | Types.ObjectId): Promise<number>;
};
//# sourceMappingURL=deviceToken.service.d.ts.map