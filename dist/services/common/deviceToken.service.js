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
            // If deviceId is provided, try to find existing token for this user-device combination
            if (data.deviceId) {
                const existingToken = await deviceToken_model_1.DeviceTokenModel.findOne({
                    userId,
                    deviceId: data.deviceId,
                    isActive: true,
                });
                if (existingToken) {
                    // Update existing token
                    await deviceToken_model_1.DeviceTokenModel.updateOne({ id: existingToken.id }, {
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
                    });
                    logger_1.logger.info('Device token updated', {
                        userId: userId.toString(),
                        deviceId: data.deviceId,
                        deviceType: data.deviceType,
                    });
                    return;
                }
            }
            // Check if the same FCM token already exists for this user (only when fcmToken is provided)
            if (data.fcmToken) {
                const existingFcmToken = await deviceToken_model_1.DeviceTokenModel.findOne({
                    userId,
                    fcmToken: data.fcmToken,
                    isActive: true,
                });
                if (existingFcmToken) {
                    await deviceToken_model_1.DeviceTokenModel.updateOne({ id: existingFcmToken.id }, {
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
                    });
                    logger_1.logger.info('FCM token updated', {
                        userId: userId.toString(),
                        fcmToken: data.fcmToken.substring(0, 20) + '...',
                        deviceType: data.deviceType,
                    });
                    return;
                }
            }
            // Create new device token
            await deviceToken_model_1.DeviceTokenModel.create({
                id: (0, uuid_1.v4)(),
                userId,
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
            logger_1.logger.info('New device token registered', {
                userId: userId.toString(),
                deviceType: data.deviceType,
                deviceId: data.deviceId,
            });
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
     * Supports both MongoDB ObjectId and custom UUID string
     */
    async getUserDeviceTokens(userId) {
        let userIdObj;
        if (userId instanceof mongoose_1.Types.ObjectId) {
            userIdObj = userId;
        }
        else if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            // Valid MongoDB ObjectId string (24 hex characters)
            userIdObj = new mongoose_1.Types.ObjectId(userId);
        }
        else {
            // Custom UUID string - need to look up user's ObjectId
            const { getUserObjectId } = await Promise.resolve().then(() => __importStar(require('../../utils/userCache')));
            const objectId = await getUserObjectId(userId);
            if (!objectId) {
                logger_1.logger.warn('User not found for getUserDeviceTokens', { userId });
                return [];
            }
            userIdObj = objectId;
        }
        const tokens = await deviceToken_model_1.DeviceTokenModel.find({
            userId: userIdObj,
            isActive: true,
        }).lean();
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
};
//# sourceMappingURL=deviceToken.service.js.map