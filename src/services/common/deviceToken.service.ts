import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { DeviceTokenModel, DeviceTokenAppContext } from '../../models/deviceToken.model';
import { DeviceType } from '../../enums/deviceType.enum';
import { logger } from '../../utils/logger';

export interface RegisterDeviceTokenData {
  userId: Types.ObjectId | string;
  appContext?: DeviceTokenAppContext | null; // 'user' or 'academy' - prevents user notifications reaching academy app on same device
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
      const appContext = data.appContext ?? 'user';

      const findQuery: Record<string, unknown> = { userId, isActive: true };
      const updateSet: Record<string, unknown> = {
        fcmToken: data.fcmToken,
        deviceType: data.deviceType,
        deviceName: data.deviceName,
        appVersion: data.appVersion,
        refreshToken: data.refreshToken,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        appContext,
        lastActiveAt: new Date(),
        isActive: true,
      };

      // If deviceId is provided, try to find existing token for this user-device-appContext
      if (data.deviceId) {
        const existingToken = await DeviceTokenModel.findOne({
          ...findQuery,
          deviceId: data.deviceId,
          appContext,
        }).lean();

        if (existingToken) {
          await DeviceTokenModel.updateOne(
            { id: existingToken.id },
            { $set: { ...updateSet, deviceName: data.deviceName ?? existingToken.deviceName, appVersion: data.appVersion ?? existingToken.appVersion } }
          );
          logger.info('Device token updated', { userId: userId.toString(), deviceId: data.deviceId, deviceType: data.deviceType, appContext });
          return;
        }
      }

      // Check if the same FCM token already exists for this user (only when fcmToken is provided)
      if (data.fcmToken) {
        const existingFcmToken = await DeviceTokenModel.findOne({
          ...findQuery,
          fcmToken: data.fcmToken,
        }).lean();

        if (existingFcmToken) {
          await DeviceTokenModel.updateOne(
            { id: existingFcmToken.id },
            { $set: { ...updateSet, deviceId: data.deviceId ?? existingFcmToken.deviceId, deviceName: data.deviceName ?? existingFcmToken.deviceName, appVersion: data.appVersion ?? existingFcmToken.appVersion } }
          );
          logger.info('FCM token updated', { userId: userId.toString(), fcmToken: data.fcmToken.substring(0, 20) + '...', deviceType: data.deviceType, appContext });
          return;
        }
      }

      // Create new device token
      await DeviceTokenModel.create({
        id: uuidv4(),
        userId,
        appContext,
        fcmToken: data.fcmToken ?? null,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? null,
        deviceName: data.deviceName ?? null,
        appVersion: data.appVersion ?? null,
        refreshToken: data.refreshToken ?? null,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
        isActive: true,
        lastActiveAt: new Date(),
      });

      logger.info('New device token registered', { userId: userId.toString(), deviceType: data.deviceType, deviceId: data.deviceId, appContext });
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
   * @param appContext - When 'user' or 'academy', only returns tokens from that app. Prevents user notifications reaching academy app on same device.
   */
  async getUserDeviceTokens(
    userId: string | Types.ObjectId,
    appContext?: DeviceTokenAppContext | null
  ): Promise<any[]> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      userIdObj = new Types.ObjectId(userId);
    } else {
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for getUserDeviceTokens', { userId });
        return [];
      }
      userIdObj = objectId;
    }
    
    const query: Record<string, unknown> = { userId: userIdObj, isActive: true };
    if (appContext === 'academy') {
      query.appContext = 'academy';
    } else if (appContext === 'user') {
      // Include legacy tokens (no appContext) as user tokens for backward compatibility
      query.$or = [{ appContext: 'user' }, { appContext: null }, { appContext: { $exists: false } }];
    }
    
    const tokens = await DeviceTokenModel.find(query).lean();
    return tokens;
  },

  /**
   * Blacklist refresh tokens and remove device rows for one app context (user vs academy).
   */
  async revokeAllSessionsForAppContext(
    userId: string | Types.ObjectId,
    appContext: DeviceTokenAppContext
  ): Promise<number> {
    const tokens = await this.getUserDeviceTokens(userId, appContext);
    const { blacklistToken, blacklistJti } = await import('../../utils/tokenBlacklist');

    for (const dt of tokens) {
      if (dt.refreshToken) {
        try {
          await blacklistToken(dt.refreshToken);
          const decoded = jwt.decode(dt.refreshToken) as jwt.JwtPayload | null;
          if (decoded?.jti) {
            const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : undefined;
            await blacklistJti(decoded.jti, ttl && ttl > 0 ? ttl : undefined);
          }
        } catch (error) {
          logger.warn('Failed to blacklist token in revokeAllSessionsForAppContext', {
            error: error instanceof Error ? error.message : error,
          });
        }
      }
    }

    let userIdObj: Types.ObjectId;

    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      userIdObj = new Types.ObjectId(userId);
    } else {
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for revokeAllSessionsForAppContext', { userId });
        return 0;
      }
      userIdObj = objectId;
    }

    const query: Record<string, unknown> = { userId: userIdObj };
    if (appContext === 'academy') {
      query.appContext = 'academy';
    } else {
      query.$or = [{ appContext: 'user' }, { appContext: null }, { appContext: { $exists: false } }];
    }

    const result = await DeviceTokenModel.deleteMany(query);
    return result.deletedCount ?? 0;
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

  /**
   * Physically delete a device token from the database
   * Supports both MongoDB ObjectId and custom UUID string
   */
  async deleteDeviceToken(
    userId: string | Types.ObjectId,
    deviceId?: string,
    refreshToken?: string
  ): Promise<boolean> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      userIdObj = new Types.ObjectId(userId);
    } else {
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for deleteDeviceToken', { userId });
        return false;
      }
      userIdObj = objectId;
    }
    
    const query: any = { userId: userIdObj };

    if (deviceId) {
      query.id = deviceId;
    } else if (refreshToken) {
      query.refreshToken = refreshToken;
    } else {
      throw new Error('Either deviceId or refreshToken must be provided');
    }

    const result = await DeviceTokenModel.deleteMany(query);

    logger.info('Device token deleted', {
      userId: userIdObj.toString(),
      deviceId,
      deletedCount: result.deletedCount,
    });

    return (result.deletedCount ?? 0) > 0;
  },

  /**
   * Physically delete all device tokens for a user from the database
   */
  async deleteAllDeviceTokensForUser(userId: string | Types.ObjectId): Promise<number> {
    let userIdObj: Types.ObjectId;
    
    if (userId instanceof Types.ObjectId) {
      userIdObj = userId;
    } else if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      userIdObj = new Types.ObjectId(userId);
    } else {
      const { getUserObjectId } = await import('../../utils/userCache');
      const objectId = await getUserObjectId(userId);
      if (!objectId) {
        logger.warn('User not found for deleteAllDeviceTokensForUser', { userId });
        return 0;
      }
      userIdObj = objectId;
    }
    
    const result = await DeviceTokenModel.deleteMany({ userId: userIdObj });

    logger.info('All device tokens deleted', {
      userId: userIdObj.toString(),
      deletedCount: result.deletedCount,
    });

    return result.deletedCount ?? 0;
  },
};

