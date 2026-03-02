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
exports.saveFcmToken = exports.logoutAll = exports.logout = exports.refreshToken = exports.verifyAcademyOtp = exports.sendAcademyOtp = exports.getCurrentAcademyUser = exports.verifyAcademyPasswordReset = exports.requestAcademyPasswordReset = exports.changeAcademyPassword = exports.updateAcademyAddress = exports.updateAcademyProfile = exports.socialLoginAcademyUser = exports.loginAcademyUser = exports.registerAcademyUser = void 0;
const i18n_1 = require("../../utils/i18n");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const academyAuthService = __importStar(require("../../services/client/auth.service"));
const deviceToken_service_1 = require("../../services/common/deviceToken.service");
const registerAcademyUser = async (req, res, next) => {
    try {
        const data = req.body;
        const result = await academyAuthService.registerAcademyUser(data);
        const response = new ApiResponse_1.ApiResponse(201, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, (0, i18n_1.t)('auth.register.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.registerAcademyUser = registerAcademyUser;
const loginAcademyUser = async (req, res, next) => {
    try {
        const data = req.body;
        const result = await academyAuthService.loginAcademyUser(data);
        const response = new ApiResponse_1.ApiResponse(200, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, (0, i18n_1.t)('auth.login.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.loginAcademyUser = loginAcademyUser;
const socialLoginAcademyUser = async (req, res, next) => {
    try {
        const payload = req.body;
        const result = await academyAuthService.socialLoginAcademyUser(payload);
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
exports.socialLoginAcademyUser = socialLoginAcademyUser;
const updateAcademyProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const payload = req.body;
        const file = req.file;
        const updatedUser = await academyAuthService.updateAcademyProfile(req.user.id, payload, file);
        const response = new ApiResponse_1.ApiResponse(200, { user: updatedUser }, (0, i18n_1.t)('auth.profile.updateSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAcademyProfile = updateAcademyProfile;
const updateAcademyAddress = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const payload = req.body;
        const updatedUser = await academyAuthService.updateAcademyAddress(req.user.id, payload);
        const response = new ApiResponse_1.ApiResponse(200, { user: updatedUser }, (0, i18n_1.t)('auth.profile.updateSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAcademyAddress = updateAcademyAddress;
const changeAcademyPassword = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const data = req.body;
        await academyAuthService.changeAcademyPassword(req.user.id, data);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.profile.passwordChanged'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.changeAcademyPassword = changeAcademyPassword;
const requestAcademyPasswordReset = async (req, res, next) => {
    try {
        const payload = req.body;
        const result = await academyAuthService.requestAcademyPasswordReset(payload);
        const response = new ApiResponse_1.ApiResponse(200, { mode: result.mode }, (0, i18n_1.t)('auth.password.resetOtpSent'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.requestAcademyPasswordReset = requestAcademyPasswordReset;
const verifyAcademyPasswordReset = async (req, res, next) => {
    try {
        const payload = req.body;
        const result = await academyAuthService.verifyAcademyPasswordReset(payload);
        const response = new ApiResponse_1.ApiResponse(200, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, (0, i18n_1.t)('auth.password.resetSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyAcademyPasswordReset = verifyAcademyPasswordReset;
const getCurrentAcademyUser = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.profile.unauthorized'));
        }
        const user = await academyAuthService.getCurrentAcademyUser(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { user }, (0, i18n_1.t)('auth.profile.meSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentAcademyUser = getCurrentAcademyUser;
const sendAcademyOtp = async (req, res, next) => {
    try {
        const { mobile, mode = 'login' } = req.body;
        const result = await academyAuthService.sendAcademyOtp({ mobile, mode });
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
exports.sendAcademyOtp = sendAcademyOtp;
const verifyAcademyOtp = async (req, res, next) => {
    try {
        const { mobile, otp, mode = 'login' } = req.body;
        const result = await academyAuthService.verifyAcademyOtp({ mobile, otp, mode, ...req.body });
        if (result.user && result.accessToken && result.refreshToken) {
            // Login mode - return tokens
            const response = new ApiResponse_1.ApiResponse(200, {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            }, (0, i18n_1.t)('auth.login.success'));
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
exports.verifyAcademyOtp = verifyAcademyOtp;
/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;
        const result = await academyAuthService.refreshToken(token);
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
        await academyAuthService.logout(req.user.id, accessToken, refreshToken);
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
        await academyAuthService.logoutAll(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.logout.allSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logoutAll = logoutAll;
/**
 * Save FCM token for push notifications (academy user)
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
//# sourceMappingURL=academyAuth.controller.js.map