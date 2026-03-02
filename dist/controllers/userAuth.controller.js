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
exports.removeAcademyBookmark = exports.addAcademyBookmark = exports.getAcademyBookmarks = exports.logoutDevice = exports.getUserDevices = exports.saveFcmToken = exports.updateUserFavoriteSports = exports.logoutAll = exports.logout = exports.refreshToken = exports.verifyUserOtp = exports.sendUserOtp = exports.getCurrentUser = exports.changeUserPassword = exports.updateUserAddress = exports.updateUserProfile = exports.socialLoginUser = exports.registerUser = void 0;
const i18n_1 = require("../utils/i18n");
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const authService = __importStar(require("../services/client/auth.service"));
const deviceToken_service_1 = require("../services/common/deviceToken.service");
const user_service_1 = require("../services/client/user.service");
const userAcademyBookmarkService = __importStar(require("../services/client/userAcademyBookmark.service"));
const registerUser = async (req, res, next) => {
    try {
        const data = req.body;
        const result = await authService.registerUser(data);
        const response = new ApiResponse_1.ApiResponse(201, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, 'User registered successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.registerUser = registerUser;
const socialLoginUser = async (req, res, next) => {
    try {
        const payload = req.body;
        const result = await authService.socialLoginUser(payload);
        const response = new ApiResponse_1.ApiResponse(200, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            provider: result.provider,
        }, (0, i18n_1.t)('auth.social.loginSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.socialLoginUser = socialLoginUser;
const updateUserProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const payload = req.body;
        const file = req.file;
        await authService.updateUserProfile(req.user.id, payload, file);
        // Get the updated user in the same format as /me route
        const user = await authService.getCurrentUser(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { ...user }, (0, i18n_1.t)('auth.profile.updateSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserProfile = updateUserProfile;
const updateUserAddress = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const payload = req.body;
        await authService.updateUserAddress(req.user.id, payload);
        // Get the updated user in the same format as /me route
        const user = await authService.getCurrentUser(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { ...user }, (0, i18n_1.t)('auth.profile.updateSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserAddress = updateUserAddress;
const changeUserPassword = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const data = req.body;
        await authService.changeUserPassword(req.user.id, data);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.profile.passwordChanged'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.changeUserPassword = changeUserPassword;
const getCurrentUser = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const user = await authService.getCurrentUser(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { ...user }, (0, i18n_1.t)('auth.profile.meSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentUser = getCurrentUser;
const sendUserOtp = async (req, res, next) => {
    try {
        const { mobile, mode = 'login' } = req.body;
        const result = await authService.sendUserOtp({ mobile, mode });
        const response = new ApiResponse_1.ApiResponse(200, {
            mobile: result.mobile,
            mode: result.mode,
        }, (0, i18n_1.t)('auth.login.otpSent'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.sendUserOtp = sendUserOtp;
const verifyUserOtp = async (req, res, next) => {
    try {
        const { mobile, otp, mode = 'login' } = req.body;
        const result = await authService.verifyUserOtp({ mobile, otp, mode, ...req.body });
        if (result.user && result.accessToken && result.refreshToken) {
            // Login mode - user exists, return tokens
            const response = new ApiResponse_1.ApiResponse(200, {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            }, (0, i18n_1.t)('auth.login.success'));
            res.json(response);
            return;
        }
        if (result.needsRegistration && result.tempToken) {
            // Login mode - user doesn't exist, return registration flag and temp token
            const response = new ApiResponse_1.ApiResponse(200, {
                needsRegistration: true,
                tempToken: result.tempToken,
            }, 'OTP verified. Please complete registration.');
            res.json(response);
            return;
        }
        // Other modes - just verify
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.login.otpVerified'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyUserOtp = verifyUserOtp;
/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;
        const result = await authService.refreshToken(token);
        const response = new ApiResponse_1.ApiResponse(200, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, (0, i18n_1.t)('auth.token.refreshed'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
/**
 * Logout user - blacklist current tokens
 */
const logout = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const authHeader = req.headers.authorization;
        const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
        const { refreshToken } = req.body;
        await authService.logout(req.user.id, accessToken, refreshToken);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.logout.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
/**
 * Logout from all devices - blacklist all user tokens
 */
const logoutAll = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        await authService.logoutAll(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.logout.allSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logoutAll = logoutAll;
const updateUserFavoriteSports = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const payload = req.body;
        // Validate sport IDs exist if provided and convert to ObjectIds
        let sportObjectIdsForStorage = [];
        if (payload.favoriteSports && payload.favoriteSports.length > 0) {
            const { SportModel } = await Promise.resolve().then(() => __importStar(require('../models/sport.model')));
            const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
            // Separate ObjectIds and custom_ids
            const objectIdArray = [];
            const customIdArray = [];
            payload.favoriteSports.forEach((id) => {
                if (Types.ObjectId.isValid(id)) {
                    objectIdArray.push(id);
                }
                else {
                    customIdArray.push(id);
                }
            });
            // Build query to find sports by both _id and custom_id
            const query = {
                is_active: true,
                $or: [],
            };
            if (objectIdArray.length > 0) {
                query.$or.push({ _id: { $in: objectIdArray.map((id) => new Types.ObjectId(id)) } });
            }
            if (customIdArray.length > 0) {
                query.$or.push({ custom_id: { $in: customIdArray } });
            }
            // Check if all sports exist and are active
            const existingSports = await SportModel.find(query)
                .select('_id custom_id')
                .lean();
            // Create maps for lookup
            const sportByIdMap = new Map(); // input ID -> MongoDB _id
            const sportByCustomIdMap = new Map(); // custom_id -> MongoDB _id
            existingSports.forEach((sport) => {
                const mongoId = sport._id.toString();
                if (sport.custom_id) {
                    sportByCustomIdMap.set(sport.custom_id, mongoId);
                }
                sportByIdMap.set(mongoId, mongoId);
            });
            // Find missing sport IDs and collect valid ObjectIds for storage
            const missingSportIds = [];
            payload.favoriteSports.forEach((id) => {
                let mongoId;
                if (Types.ObjectId.isValid(id)) {
                    // Check if ObjectId exists
                    mongoId = sportByIdMap.get(id);
                }
                else {
                    // Check if custom_id exists
                    mongoId = sportByCustomIdMap.get(id);
                }
                if (mongoId) {
                    sportObjectIdsForStorage.push(mongoId);
                }
                else {
                    missingSportIds.push(id);
                }
            });
            if (missingSportIds.length > 0) {
                throw new ApiError_1.ApiError(404, `Sport(s) not found or inactive: ${missingSportIds.join(', ')}`);
            }
        }
        await user_service_1.userService.update(req.user.id, {
            favoriteSports: sportObjectIdsForStorage,
        });
        // Get the updated user in the same format as /me route
        const user = await authService.getCurrentUser(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { ...user }, 'Favorite sports updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserFavoriteSports = updateUserFavoriteSports;
/**
 * Save FCM token for push notifications (user)
 */
const saveFcmToken = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        await deviceToken_service_1.deviceTokenService.registerOrUpdateDeviceToken({
            userId: req.user.id,
            fcmToken: data.fcmToken,
            deviceType: data.deviceType,
            deviceId: data.deviceId ?? undefined,
            deviceName: data.deviceName ?? undefined,
            appVersion: data.appVersion ?? undefined,
        });
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.fcmToken.saved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.saveFcmToken = saveFcmToken;
/**
 * List all active devices/sessions for the current user
 */
const getUserDevices = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const devices = await deviceToken_service_1.deviceTokenService.getUserDeviceTokens(req.user.id);
        const currentRefreshToken = req.body?.refreshToken || null;
        const result = devices.map((d) => ({
            id: d.id,
            deviceType: d.deviceType,
            deviceId: d.deviceId || null,
            deviceName: d.deviceName || null,
            appVersion: d.appVersion || null,
            lastActiveAt: d.lastActiveAt,
            createdAt: d.createdAt,
            isCurrent: currentRefreshToken ? d.refreshToken === currentRefreshToken : false,
        }));
        const response = new ApiResponse_1.ApiResponse(200, { devices: result }, 'Active devices retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserDevices = getUserDevices;
/**
 * Logout from a specific device by deviceToken id
 */
const logoutDevice = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { deviceTokenId } = req.params;
        if (!deviceTokenId) {
            throw new ApiError_1.ApiError(400, 'Device token ID is required');
        }
        const removed = await authService.logoutDevice(req.user.id, deviceTokenId);
        if (!removed) {
            throw new ApiError_1.ApiError(404, 'Device session not found or already logged out');
        }
        const response = new ApiResponse_1.ApiResponse(200, null, 'Device logged out successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logoutDevice = logoutDevice;
/**
 * Get user's bookmarked academies
 */
const getAcademyBookmarks = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const bookmarks = await userAcademyBookmarkService.getBookmarkedAcademies(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { bookmarks }, 'Bookmarked academies retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAcademyBookmarks = getAcademyBookmarks;
/**
 * Add academy to bookmarks. Returns updated list of bookmarked academies.
 */
const addAcademyBookmark = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { academyId } = req.body;
        const result = await userAcademyBookmarkService.addBookmark(req.user.id, academyId);
        const message = result.added ? 'Academy added to bookmarks' : 'Academy already bookmarked';
        const response = new ApiResponse_1.ApiResponse(200, result, message);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addAcademyBookmark = addAcademyBookmark;
/**
 * Remove academy from bookmarks. Returns updated list of bookmarked academies.
 */
const removeAcademyBookmark = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { academyId } = req.params;
        const result = await userAcademyBookmarkService.removeBookmark(req.user.id, academyId);
        const message = result.removed ? 'Academy removed from bookmarks' : 'Academy was not bookmarked';
        const response = new ApiResponse_1.ApiResponse(200, result, message);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.removeAcademyBookmark = removeAcademyBookmark;
//# sourceMappingURL=userAuth.controller.js.map