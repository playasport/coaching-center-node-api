import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { DeviceTokenModel } from '../../models/deviceToken.model';
import { DeviceType } from '../../enums/deviceType.enum';
import { logger } from '../../utils/logger';

export interface RegisterDeviceTokenData {
  userId: Types.ObjectId | string;
  fcmToken: string;
  deviceType: DeviceType;
  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  refreshToken?: string | null; // Optional: Refresh token for this device
  refreshTokenExpiresAt?: Date | null; // Optional: Refresh token expiration
}

export interface UpdateDeviceTokenData {
  fcmToken?: string;
  deviceName?: string | null;
  appVersion?: string | null;
  isActive?: boolean;
}

export const deviceTokenService = {
  /**
   * Register or update a device token for a user
   * If deviceId is provided and a token exists for that device, it will be updated
   * Otherwise, a new token will be created
   */
  async registerOrUpdateDeviceToken(
    data: RegisterDeviceTokenData
  ): Promise<void> {
    try {
      const userId = typeof data.userId === 'string' ? new Types.ObjectId(data.userId) : data.userId;

      // If deviceId is provided, try to find existing token for this user-device combination
      if (data.deviceId) {
        const existingToken = await DeviceTokenModel.findOne({
          userId,
          deviceId: data.deviceId,
          isActive: true,
        });

        if (existingToken) {
          // Update existing token
          await DeviceTokenModel.updateOne(
            { id: existingToken.id },
            {
              $set: {
                fcmToken: data.fcmToken,
                deviceType: data.deviceType,
                deviceName: data.deviceName ?? existingToken.deviceName,
                appVersion: data.appVersion ?? existingToken.appVersion,
                refreshToken: data.refreshToken ?? existingToken.refreshToken,
                refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? existingToken.refreshTokenExpiresAt,
                lastActiveAt: new Date(),
                isActive: true,
              },
            }
          );
          logger.info('Device token updated', {
            userId: userId.toString(),
            deviceId: data.deviceId,
            deviceType: data.deviceType,
          });
          return;
        }
      }

      // Check if the same FCM token already exists for this user
      const existingFcmToken = await DeviceTokenModel.findOne({
        userId,
        fcmToken: data.fcmToken,
        isActive: true,
      });

      if (existingFcmToken) {
        // Update existing FCM token
        await DeviceTokenModel.updateOne(
          { id: existingFcmToken.id },
          {
            $set: {
              deviceType: data.deviceType,
              deviceId: data.deviceId ?? existingFcmToken.deviceId,
              deviceName: data.deviceName ?? existingFcmToken.deviceName,
              appVersion: data.appVersion ?? existingFcmToken.appVersion,
              refreshToken: data.refreshToken ?? existingFcmToken.refreshToken,
              refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? existingFcmToken.refreshTokenExpiresAt,
              lastActiveAt: new Date(),
              isActive: true,
            },
          }
        );
        logger.info('FCM token updated', {
          userId: userId.toString(),
          fcmToken: data.fcmToken.substring(0, 20) + '...',
          deviceType: data.deviceType,
        });
        return;
      }

      // Create new device token
      await DeviceTokenModel.create({
        id: uuidv4(),
        userId,
        fcmToken: data.fcmToken,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? null,
        deviceName: data.deviceName ?? null,
        appVersion: data.appVersion ?? null,
        refreshToken: data.refreshToken ?? null,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
        isActive: true,
        lastActiveAt: new Date(),
      });

      logger.info('New device token registered', {
        userId: userId.toString(),
        deviceType: data.deviceType,
        deviceId: data.deviceId,
      });
    } catch (error) {
      logger.error('Failed to register/update device token', {
        error: error instanceof Error ? error.message : error,
        userId: data.userId,
        deviceType: data.deviceType,
      });
      // Don't throw error - FCM token registration should not block login/registration
    }
  },

  /**
   * Get all active device tokens for a user
   * Supports both MongoDB ObjectId and custom UUID string
   */
  async getUserDeviceTokens(userId: string | Types.ObjectId): Promise<any[]> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      // Valid MongoDB ObjectId string (24 hex characters)
      userIdObj = new Types.ObjectId(userId);
    } else {
      // Custom UUID string - need to look up user's ObjectId
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for getUserDeviceTokens', { userId });
        return [];
      }
      userIdObj = objectId;
    }
    
    const tokens = await DeviceTokenModel.find({
      userId: userIdObj,
      isActive: true,
    }).lean();

    return tokens;
  },

  /**
   * Deactivate a device token (mark as inactive)
   * Supports both MongoDB ObjectId and custom UUID string
   */
  async deactivateDeviceToken(
    userId: string | Types.ObjectId,
    deviceId?: string,
    fcmToken?: string
  ): Promise<void> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      // Valid MongoDB ObjectId string
      userIdObj = new Types.ObjectId(userId);
    } else {
      // Custom UUID string - need to look up user's ObjectId
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for deactivateDeviceToken', { userId });
        return;
      }
      userIdObj = objectId;
    }
    
    const query: any = { userId: userIdObj, isActive: true };

    if (deviceId) {
      query.deviceId = deviceId;
    } else if (fcmToken) {
      query.fcmToken = fcmToken;
    } else {
      throw new Error('Either deviceId or fcmToken must be provided');
    }

    await DeviceTokenModel.updateMany(query, {
      $set: { isActive: false },
    });

    logger.info('Device token deactivated', {
      userId: userIdObj.toString(),
      deviceId,
      fcmToken: fcmToken ? fcmToken.substring(0, 20) + '...' : undefined,
    });
  },

  /**
   * Deactivate all device tokens for a user (logout from all devices)
   */
  async deactivateAllDeviceTokens(userId: string | Types.ObjectId): Promise<void> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      // Valid MongoDB ObjectId string
      userIdObj = new Types.ObjectId(userId);
    } else {
      // UUID string - need to look up user's ObjectId
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for deactivateAllDeviceTokens', { userId });
        return; // User not found, nothing to deactivate
      }
      userIdObj = objectId;
    }
    
    await DeviceTokenModel.updateMany(
      { userId: userIdObj, isActive: true },
      { 
        $set: { 
          isActive: false,
          refreshToken: null,
          refreshTokenExpiresAt: null,
        } 
      }
    );

    logger.info('All device tokens deactivated', {
      userId: userIdObj.toString(),
    });
  },

  /**
   * Find device token by refresh token
   */
  async findDeviceByRefreshToken(refreshToken: string): Promise<any | null> {
    const device = await DeviceTokenModel.findOne({
      refreshToken,
      isActive: true,
    }).lean();

    if (device && device.refreshTokenExpiresAt) {
      // Check if refresh token is expired
      if (new Date(device.refreshTokenExpiresAt) < new Date()) {
        return null;
      }
    }

    return device;
  },

  /**
   * Update refresh token for a device
   */
  async updateDeviceRefreshToken(
    deviceId: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<void> {
    await DeviceTokenModel.updateOne(
      { id: deviceId },
      {
        $set: {
          refreshToken,
          refreshTokenExpiresAt: expiresAt,
          lastActiveAt: new Date(),
        },
      }
    );
  },

  /**
   * Revoke refresh token for a specific device
   * Supports both MongoDB ObjectId and custom UUID string
   */
  async revokeDeviceRefreshToken(
    userId: string | Types.ObjectId,
    deviceId?: string,
    refreshToken?: string
  ): Promise<void> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      // Valid MongoDB ObjectId string
      userIdObj = new Types.ObjectId(userId);
    } else {
      // Custom UUID string - need to look up user's ObjectId
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for revokeDeviceRefreshToken', { userId });
        return;
      }
      userIdObj = objectId;
    }
    
    const query: any = { userId: userIdObj, isActive: true };

    if (deviceId) {
      query.id = deviceId;
    } else if (refreshToken) {
      query.refreshToken = refreshToken;
    } else {
      throw new Error('Either deviceId or refreshToken must be provided');
    }

    await DeviceTokenModel.updateMany(query, {
      $set: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    logger.info('Device refresh token revoked', {
      userId: userIdObj.toString(),
      deviceId,
    });
  },
};

