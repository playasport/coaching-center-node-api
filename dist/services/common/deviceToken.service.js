"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceTokenService = void 0;
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const deviceToken_model_1 = require("../../models/deviceToken.model");
const logger_1 = require("../../utils/logger");
exports.deviceTokenService = {
    /**
     * Register or update a device token for a user
     * If deviceId is provided and a token exists for that device, it will be updated
     * Otherwise, a new token will be created
     */
    async registerOrUpdateDeviceToken(data) {
        try {
            const userId = typeof data.userId === 'string' ? new mongoose_1.Types.ObjectId(data.userId) : data.userId;
            const appContext = data.appContext ?? 'user';
            const findQuery = { userId, isActive: true };
            const updateSet = {
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
                const existingToken = await deviceToken_model_1.DeviceTokenModel.findOne({
                    ...findQuery,
                    deviceId: data.deviceId,
                    appContext,
                }).lean();
                if (existingToken) {
                    await deviceToken_model_1.DeviceTokenModel.updateOne({ id: existingToken.id }, { $set: { ...updateSet, deviceName: data.deviceName ?? existingToken.deviceName, appVersion: data.appVersion ?? existingToken.appVersion } });
                    logger_1.logger.info('Device token updated', { userId: userId.toString(), deviceId: data.deviceId, deviceType: data.deviceType, appContext });
                    return;
                }
            }
            // Check if the same FCM token already exists for this user (only when fcmToken is provided)
            if (data.fcmToken) {
                const existingFcmToken = await deviceToken_model_1.DeviceTokenModel.findOne({
                    ...findQuery,
                    fcmToken: data.fcmToken,
                }).lean();
                if (existingFcmToken) {
                    await deviceToken_model_1.DeviceTokenModel.updateOne({ id: existingFcmToken.id }, { $set: { ...updateSet, deviceId: data.deviceId ?? existingFcmToken.deviceId, deviceName: data.deviceName ?? existingFcmToken.deviceName, appVersion: data.appVersion ?? existingFcmToken.appVersion } });
                    logger_1.logger.info('FCM token updated', { userId: userId.toString(), fcmToken: data.fcmToken.substring(0, 20) + '...', deviceType: data.deviceType, appContext });
                    return;
                }
            }
            // Create new device token
            await deviceToken_model_1.DeviceTokenModel.create({
                id: (0, uuid_1.v4)(),
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
            logger_1.logger.info('New device token registered', { userId: userId.toString(), deviceType: data.deviceType, deviceId: data.deviceId, appContext });
        }
        catch (error) {
            logger_1.logger.error('Failed to register/update device token', {
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
    async getUserDeviceTokens(userId, appContext) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for getUserDeviceTokens', { userId });
                return [];
            }
            userIdObj = objectId;
        }
        const query = { userId: userIdObj, isActive: true };
        if (appContext === 'academy') {
            query.appContext = 'academy';
        }
        else if (appContext === 'user') {
            // Include legacy tokens (no appContext) as user tokens for backward compatibility
            query.$or = [{ appContext: 'user' }, { appContext: null }, { appContext: { $exists: false } }];
        }
        const tokens = await deviceToken_model_1.DeviceTokenModel.find(query).lean();
        return tokens;
    },
    /**
     * Deactivate a device token (mark as inactive)
     * Supports both MongoDB ObjectId and custom UUID string
     */
    async deactivateDeviceToken(userId, deviceId, fcmToken) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            // Valid MongoDB ObjectId string
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            // Custom UUID string - need to look up user's ObjectId
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for deactivateDeviceToken', { userId });
                return;
            }
            userIdObj = objectId;
        }
        const query = { userId: userIdObj, isActive: true };
        if (deviceId) {
            query.deviceId = deviceId;
        }
        else if (fcmToken) {
            query.fcmToken = fcmToken;
        }
        else {
            throw new Error('Either deviceId or fcmToken must be provided');
        }
        await deviceToken_model_1.DeviceTokenModel.updateMany(query, {
            $set: { isActive: false },
        });
        logger_1.logger.info('Device token deactivated', {
            userId: userIdObj.toString(),
            deviceId,
            fcmToken: fcmToken ? fcmToken.substring(0, 20) + '...' : undefined,
        });
    },
    /**
     * Deactivate all device tokens for a user (logout from all devices)
     */
    async deactivateAllDeviceTokens(userId) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            // Valid MongoDB ObjectId string
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            // UUID string - need to look up user's ObjectId
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for deactivateAllDeviceTokens', { userId });
                return; // User not found, nothing to deactivate
            }
            userIdObj = objectId;
        }
        await deviceToken_model_1.DeviceTokenModel.updateMany({ userId: userIdObj, isActive: true }, {
            $set: {
                isActive: false,
                refreshToken: null,
                refreshTokenExpiresAt: null,
            }
        });
        logger_1.logger.info('All device tokens deactivated', {
            userId: userIdObj.toString(),
        });
    },
    /**
     * Find device token by refresh token
     */
    async findDeviceByRefreshToken(refreshToken) {
        const device = await deviceToken_model_1.DeviceTokenModel.findOne({
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
    async updateDeviceRefreshToken(deviceId, refreshToken, expiresAt) {
        await deviceToken_model_1.DeviceTokenModel.updateOne({ id: deviceId }, {
            $set: {
                refreshToken,
                refreshTokenExpiresAt: expiresAt,
                lastActiveAt: new Date(),
            },
        });
    },
    /**
     * Revoke refresh token for a specific device
     * Supports both MongoDB ObjectId and custom UUID string
     */
    async revokeDeviceRefreshToken(userId, deviceId, refreshToken) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            // Valid MongoDB ObjectId string
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            // Custom UUID string - need to look up user's ObjectId
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for revokeDeviceRefreshToken', { userId });
                return;
            }
            userIdObj = objectId;
        }
        const query = { userId: userIdObj, isActive: true };
        if (deviceId) {
            query.id = deviceId;
        }
        else if (refreshToken) {
            query.refreshToken = refreshToken;
        }
        else {
            throw new Error('Either deviceId or refreshToken must be provided');
        }
        await deviceToken_model_1.DeviceTokenModel.updateMany(query, {
            $set: {
                refreshToken: null,
                refreshTokenExpiresAt: null,
            },
        });
        logger_1.logger.info('Device refresh token revoked', {
            userId: userIdObj.toString(),
            deviceId,
        });
    },
    /**
     * Physically delete a device token from the database
     * Supports both MongoDB ObjectId and custom UUID string
     */
    async deleteDeviceToken(userId, deviceId, refreshToken) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for deleteDeviceToken', { userId });
                return false;
            }
            userIdObj = objectId;
        }
        const query = { userId: userIdObj };
        if (deviceId) {
            query.id = deviceId;
        }
        else if (refreshToken) {
            query.refreshToken = refreshToken;
        }
        else {
            throw new Error('Either deviceId or refreshToken must be provided');
        }
        const result = await deviceToken_model_1.DeviceTokenModel.deleteMany(query);
        logger_1.logger.info('Device token deleted', {
            userId: userIdObj.toString(),
            deviceId,
            deletedCount: result.deletedCount,
        });
        return (result.deletedCount ?? 0) > 0;
    },
    /**
     * Physically delete all device tokens for a user from the database
     */
    async deleteAllDeviceTokensForUser(userId) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for deleteAllDeviceTokensForUser', { userId });
                return 0;
            }
            userIdObj = objectId;
        }
        const result = await deviceToken_model_1.DeviceTokenModel.deleteMany({ userId: userIdObj });
        logger_1.logger.info('All device tokens deleted', {
            userId: userIdObj.toString(),
            deletedCount: result.deletedCount,
        });
        return result.deletedCount ?? 0;
    },
};
//# sourceMappingURL=deviceToken.service.js.map