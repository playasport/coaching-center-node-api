import { Types } from 'mongoose';
import { DeviceType } from '../enums/deviceType.enum';
export interface RegisterDeviceTokenData {
    userId: Types.ObjectId | string;
    fcmToken: string;
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
     */
    getUserDeviceTokens(userId: string | Types.ObjectId): Promise<any[]>;
    /**
     * Deactivate a device token (mark as inactive)
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
     */
    revokeDeviceRefreshToken(userId: string | Types.ObjectId, deviceId?: string, refreshToken?: string): Promise<void>;
};
//# sourceMappingURL=deviceToken.service.d.ts.map