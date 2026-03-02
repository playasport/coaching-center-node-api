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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserOtp = exports.sendUserOtp = exports.getCurrentUser = exports.verifyUserPasswordReset = exports.requestUserPasswordReset = exports.changeUserPassword = exports.updateUserAddress = exports.updateUserProfile = exports.socialLoginUser = exports.loginUser = exports.registerUser = exports.logoutDevice = exports.logoutAll = exports.logout = exports.refreshToken = exports.verifyAcademyOtp = exports.sendAcademyOtp = exports.getCurrentAcademyUser = exports.verifyAcademyPasswordReset = exports.requestAcademyPasswordReset = exports.changeAcademyPassword = exports.updateAcademyAddress = exports.updateAcademyProfile = exports.socialLoginAcademyUser = exports.loginAcademyUser = exports.registerAcademyUser = void 0;
const uuid_1 = require("uuid");
const i18n_1 = require("../../utils/i18n");
const user_service_1 = require("./user.service");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const otpChannel_enum_1 = require("../../enums/otpChannel.enum");
const otpMode_enum_1 = require("../../enums/otpMode.enum");
const env_1 = require("../../config/env");
const utils_1 = require("../../utils");
const jwt_1 = require("../../utils/jwt");
const tokenBlacklist_1 = require("../../utils/tokenBlacklist");
const notificationQueue_service_1 = require("../common/notificationQueue.service");
const notificationMessages_1 = require("../common/notificationMessages");
const email_service_1 = require("../common/email.service");
const otp_service_1 = require("../common/otp.service");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const firebaseAuth_service_1 = require("../common/firebaseAuth.service");
const s3_service_1 = require("../common/s3.service");
const deviceToken_service_1 = require("../common/deviceToken.service");
const deviceToken_model_1 = require("../../models/deviceToken.model");
const deviceType_enum_1 = require("../../enums/deviceType.enum");
const userCache_1 = require("../../utils/userCache");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Helper function to get role name from roles array
const getRoleName = (user) => {
    const roles = user.roles;
    return roles && roles.length > 0 ? roles[0]?.name : defaultRoles_enum_1.DefaultRoles.USER;
};
// Helper function to check if user has a specific role
const hasRole = (user, roleName) => {
    const roles = user.roles;
    if (!roles || roles.length === 0)
        return false;
    return roles.some((r) => r?.name === roleName);
};
/**
 * Helper function to generate tokens and store refresh token in device token
 * This ensures device-specific refresh tokens with appropriate expiry
 */
const generateTokensAndStoreDeviceToken = async (user, roleName, deviceData) => {
    // Clear user-level blacklist if it exists (user is logging in again after logout all)
    // Fire-and-forget: don't block token generation on Redis operation
    (0, tokenBlacklist_1.clearUserBlacklist)(user.id).catch((error) => {
        logger_1.logger.error('Failed to clear user blacklist (non-blocking)', {
            userId: user.id,
            error: error instanceof Error ? error.message : error,
        });
    });
    const deviceType = deviceData?.deviceType || 'web';
    // Generate tokens with device-specific expiry
    const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
        id: user.id,
        email: user.email,
        role: roleName,
    }, deviceType, deviceData?.deviceId);
    // Always store device session for session tracking
    try {
        const decoded = jsonwebtoken_1.default.decode(refreshToken);
        const refreshTokenExpiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : null;
        const userObjectId = await (0, userCache_1.getUserObjectId)(user.id);
        if (!userObjectId) {
            logger_1.logger.error('Failed to get user ObjectId for device token storage', {
                userId: user.id,
            });
            return { accessToken, refreshToken };
        }
        await deviceToken_service_1.deviceTokenService.registerOrUpdateDeviceToken({
            userId: userObjectId,
            fcmToken: deviceData?.fcmToken ?? null,
            deviceType: deviceData?.deviceType || deviceType_enum_1.DeviceType.WEB,
            deviceId: deviceData?.deviceId ?? null,
            deviceName: deviceData?.deviceName ?? null,
            appVersion: deviceData?.appVersion ?? null,
            refreshToken,
            refreshTokenExpiresAt,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to store device session', {
            error: error instanceof Error ? error.message : error,
            userId: user.id,
            deviceType: deviceData?.deviceType || 'web',
        });
    }
    return { accessToken, refreshToken };
};
/**
 * Register a new academy user
 */
const registerAcademyUser = async (data) => {
    const { firstName, lastName, email, password, mobile, otp } = data;
    if (!otp) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.otp.required'));
    }
    // Check if email already exists before OTP verification
    const existingUser = await user_service_1.userService.findByEmail(email);
    if (existingUser) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.emailExists'));
    }
    // Check if mobile number already exists for ACADEMY role
    const existingUserByMobile = await user_service_1.userService.findByMobile(mobile);
    if (existingUserByMobile && hasRole(existingUserByMobile, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.mobileExists'));
    }
    const otpStatus = await otp_service_1.otpService.verifyOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode_enum_1.OtpMode.REGISTER);
    if (otpStatus !== 'valid') {
        const messageMap = {
            not_found: (0, i18n_1.t)('auth.login.invalidOtp'),
            consumed: (0, i18n_1.t)('auth.login.otpUsed'),
            expired: (0, i18n_1.t)('auth.login.otpExpired'),
            invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
        };
        throw new ApiError_1.ApiError(400, messageMap[otpStatus] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
    }
    const user = await user_service_1.userService.create({
        id: (0, uuid_1.v4)(),
        email,
        password,
        firstName,
        lastName,
        mobile,
        role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
        registrationMethod: 'mobile', // Academy registration uses mobile OTP
        isActive: true,
    });
    // Get role name from populated roles array
    const roleName = getRoleName(user);
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, roleName, {
        fcmToken: data.fcmToken ?? undefined,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? undefined,
        deviceName: data.deviceName ?? undefined,
        appVersion: data.appVersion ?? undefined,
    });
    // Send welcome email to academy owner
    try {
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        const registrationDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        (0, notificationQueue_service_1.queueEmail)(email, 'Welcome to PlayAsport Academy!', {
            template: 'academy-welcome.html',
            templateVariables: {
                name: fullName,
                email: email,
                mobile: mobile ? `+91${mobile}` : 'Not provided',
                registrationDate,
                year: new Date().getFullYear(),
            },
            priority: 'high',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to queue academy welcome email', { error, email });
    }
    // Send notification email to admin
    if (env_1.config.admin.email) {
        try {
            const fullName = lastName ? `${firstName} ${lastName}` : firstName;
            const registrationDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, 'New Academy Registration - PlayAsport', {
                template: 'academy-registration-admin.html',
                templateVariables: {
                    name: fullName,
                    email: email,
                    mobile: mobile ? `+91${mobile}` : 'Not provided',
                    registrationDate,
                    userId: user.id,
                    year: new Date().getFullYear(),
                },
                priority: 'high',
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to queue academy registration admin email', { error });
        }
    }
    // Create notification for admin and super_admin when academy registers
    try {
        const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        const pushNotification = (0, notificationMessages_1.getNewAcademyRegistrationAdminPush)({
            userName: fullName,
            userEmail: email,
        });
        await createAndSendNotification({
            recipientType: 'role',
            roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
            title: pushNotification.title,
            body: pushNotification.body,
            channels: ['push'],
            priority: 'medium',
            data: {
                type: 'academy_registration',
                userId: user.id,
                email: email,
            },
            metadata: {
                source: 'academy_registration',
                registrationDate: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create academy registration notification', { error });
        // Don't throw error - notification failure shouldn't break registration
    }
    return {
        user,
        accessToken,
        refreshToken,
    };
};
exports.registerAcademyUser = registerAcademyUser;
/**
 * Login academy user with email and password
 */
const loginAcademyUser = async (data) => {
    const { email, password } = data;
    let user = await user_service_1.userService.findByEmailWithPassword(email);
    if (!user || !user.password) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
    }
    // If user has 'user' role and trying to login as academy, add academy role (keep user role)
    if (hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        const updatedUser = await user_service_1.userService.update(user.id, {
            role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
            addRole: true,
        });
        if (updatedUser) {
            // Refetch to get updated roles with password (userService.update sanitizes password)
            const refetchedUser = await user_service_1.userService.findByEmailWithPassword(email);
            if (refetchedUser) {
                user = refetchedUser;
            }
        }
    }
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (!user.isActive || user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    const isPasswordValid = await (0, utils_1.comparePassword)(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
    }
    const sanitizedUser = user_service_1.userService.sanitize(user);
    if (!sanitizedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, defaultRoles_enum_1.DefaultRoles.ACADEMY, {
        fcmToken: data.fcmToken ?? undefined,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? undefined,
        deviceName: data.deviceName ?? undefined,
        appVersion: data.appVersion ?? undefined,
    });
    return {
        user: sanitizedUser,
        accessToken,
        refreshToken,
    };
};
exports.loginAcademyUser = loginAcademyUser;
/**
 * Social login for academy user
 */
const socialLoginAcademyUser = async (data) => {
    const payload = data;
    const decodedToken = await firebaseAuth_service_1.firebaseAuthService.verifyIdToken(payload.idToken);
    const email = decodedToken.email?.toLowerCase();
    if (!email) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.social.missingEmail'));
    }
    let user = await user_service_1.userService.findByEmail(email);
    if (!user) {
        const nameFromToken = decodedToken.name ?? '';
        const [tokenFirstName, ...tokenLastParts] = nameFromToken.trim().split(/\s+/).filter(Boolean);
        const firstName = payload.firstName?.trim() ||
            tokenFirstName ||
            'User';
        const lastName = payload.lastName?.trim() ||
            (tokenLastParts.length ? tokenLastParts.join(' ') : decodedToken.family_name || null) ||
            null;
        // Determine registration method from provider
        const provider = payload.provider?.toLowerCase() || decodedToken.firebase?.sign_in_provider?.toLowerCase() || 'google';
        let registrationMethod = 'google';
        if (provider.includes('google')) {
            registrationMethod = 'google';
        }
        else if (provider.includes('facebook')) {
            registrationMethod = 'facebook';
        }
        else if (provider.includes('apple')) {
            registrationMethod = 'apple';
        }
        else if (provider.includes('instagram')) {
            registrationMethod = 'instagram';
        }
        user = await user_service_1.userService.create({
            id: (0, uuid_1.v4)(),
            email,
            firstName,
            lastName,
            password: `${(0, uuid_1.v4)()}!Social1`,
            role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
            registrationMethod,
            isActive: true,
        });
    }
    // If user has 'user' role and trying to login as academy, add academy role (keep user role)
    if (hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        const updatedUser = await user_service_1.userService.update(user.id, {
            role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
            addRole: true,
        });
        if (updatedUser) {
            // Refetch to get updated roles
            const refetchedUser = await user_service_1.userService.findByEmail(email);
            if (refetchedUser) {
                user = refetchedUser;
            }
        }
    }
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (!user.isActive || user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, defaultRoles_enum_1.DefaultRoles.ACADEMY, {
        fcmToken: payload.fcmToken ?? undefined,
        deviceType: payload.deviceType,
        deviceId: payload.deviceId ?? undefined,
        deviceName: payload.deviceName ?? undefined,
        appVersion: payload.appVersion ?? undefined,
    });
    return {
        user,
        accessToken,
        refreshToken,
        provider: payload.provider ?? decodedToken.firebase?.sign_in_provider,
    };
};
exports.socialLoginAcademyUser = socialLoginAcademyUser;
/**
 * Update academy user profile
 */
const updateAcademyProfile = async (userId, data, file) => {
    const existingUser = await user_service_1.userService.findById(userId);
    if (!existingUser) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const updates = {};
    if (data.firstName) {
        updates.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
        updates.lastName = data.lastName ?? null;
    }
    // Handle profile image upload
    if (file) {
        try {
            logger_1.logger.info('Starting profile image upload', {
                userId: existingUser.id,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            });
            // Delete old profile image if exists
            if (existingUser.profileImage) {
                try {
                    await (0, s3_service_1.deleteFileFromS3)(existingUser.profileImage);
                    logger_1.logger.info('Old profile image deleted', { oldImageUrl: existingUser.profileImage });
                }
                catch (deleteError) {
                    logger_1.logger.warn('Failed to delete old profile image, continuing with upload', deleteError);
                    // Don't fail the upload if deletion fails
                }
            }
            // Upload new image to S3
            const imageUrl = await (0, s3_service_1.uploadFileToS3)({
                file,
                folder: 'users',
                userId: existingUser.id,
            });
            updates.profileImage = imageUrl;
            logger_1.logger.info('Profile image uploaded successfully', { imageUrl, userId: existingUser.id });
        }
        catch (error) {
            logger_1.logger.error('Failed to upload profile image', {
                error: error?.message || error,
                stack: error?.stack,
                userId: existingUser.id,
                fileName: file?.originalname,
            });
            throw new ApiError_1.ApiError(500, error?.message || (0, i18n_1.t)('auth.profile.imageUploadFailed'));
        }
    }
    if (!Object.keys(updates).length && !file) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.profile.noChanges'));
    }
    const updatedUser = await user_service_1.userService.update(existingUser.id, updates);
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    return updatedUser;
};
exports.updateAcademyProfile = updateAcademyProfile;
/**
 * Update academy user address
 */
const updateAcademyAddress = async (userId, data) => {
    const existingUser = await user_service_1.userService.findById(userId);
    if (!existingUser) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const updatedUser = await user_service_1.userService.update(existingUser.id, {
        address: {
            ...data.address,
            isDeleted: false,
        },
    });
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    return updatedUser;
};
exports.updateAcademyAddress = updateAcademyAddress;
/**
 * Change academy user password
 */
const changeAcademyPassword = async (userId, data) => {
    const { currentPassword, newPassword } = data;
    const user = await user_service_1.userService.findByIdWithPassword(userId);
    if (!user || !user.password) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const isCurrentValid = await (0, utils_1.comparePassword)(currentPassword, user.password);
    if (!isCurrentValid) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.profile.invalidCurrentPassword'));
    }
    await user_service_1.userService.update(user.id, { password: newPassword });
};
exports.changeAcademyPassword = changeAcademyPassword;
/**
 * Request password reset OTP
 */
const requestAcademyPasswordReset = async (data) => {
    const otp = env_1.config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
    if (data.mode === 'mobile') {
        let user = await user_service_1.userService.findByMobile(data.mobile);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
        if (hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            const updatedUser = await user_service_1.userService.update(user.id, {
                role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                addRole: true,
            });
            if (updatedUser) {
                // Refetch to get updated roles array
                const refetchedUser = await user_service_1.userService.findByMobile(data.mobile);
                if (refetchedUser) {
                    user = refetchedUser;
                }
            }
        }
        // Check if user has academy role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: data.mobile }, otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
        const mobileNumber = `+91${data.mobile}`;
        (0, notificationQueue_service_1.queueSms)(mobileNumber, (0, notificationMessages_1.getOtpSms)({ otp }), 'high', { type: 'otp' });
    }
    else {
        const emailLower = data.email.toLowerCase();
        let user = await user_service_1.userService.findByEmail(emailLower);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
        if (hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            const updatedUser = await user_service_1.userService.update(user.id, {
                role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                addRole: true,
            });
            if (updatedUser) {
                // Refetch to get updated roles array
                const refetchedUser = await user_service_1.userService.findByEmail(emailLower);
                if (refetchedUser) {
                    user = refetchedUser;
                }
            }
        }
        // Check if user has academy role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.EMAIL, identifier: emailLower }, otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
        await (0, email_service_1.sendPasswordResetEmail)(emailLower, otp, {
            name: user.firstName || 'User',
        });
    }
    return { mode: data.mode };
};
exports.requestAcademyPasswordReset = requestAcademyPasswordReset;
/**
 * Verify password reset OTP and reset password
 */
const verifyAcademyPasswordReset = async (data) => {
    const identifier = data.mode === 'mobile' ? data.mobile : data.email.toLowerCase();
    const channel = data.mode === 'mobile' ? otpChannel_enum_1.OtpChannel.MOBILE : otpChannel_enum_1.OtpChannel.EMAIL;
    const status = await otp_service_1.otpService.verifyOtp({ channel, identifier }, data.otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
    if (status !== 'valid') {
        const messageMap = {
            not_found: (0, i18n_1.t)('auth.password.resetOtpInvalid'),
            consumed: (0, i18n_1.t)('auth.login.otpUsed'),
            expired: (0, i18n_1.t)('auth.login.otpExpired'),
            invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
        };
        throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
    }
    const user = data.mode === 'mobile'
        ? await user_service_1.userService.findByMobile(data.mobile)
        : await user_service_1.userService.findByEmail(identifier);
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
    }
    const roleName = getRoleName(user);
    if (roleName !== defaultRoles_enum_1.DefaultRoles.ACADEMY) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    const updatedUser = await user_service_1.userService.update(user.id, {
        password: data.newPassword,
    });
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    // Generate tokens (password reset doesn't typically have device info, use web default)
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(updatedUser, getRoleName(updatedUser), undefined);
    return {
        user: updatedUser,
        accessToken,
        refreshToken,
    };
};
exports.verifyAcademyPasswordReset = verifyAcademyPasswordReset;
/**
 * Get current academy user
 */
const getCurrentAcademyUser = async (userId) => {
    const user = await user_service_1.userService.findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    return user;
};
exports.getCurrentAcademyUser = getCurrentAcademyUser;
/**
 * Send OTP to mobile number
 */
const sendAcademyOtp = async (data) => {
    const { mobile, mode = 'login' } = data;
    let existingUser = await user_service_1.userService.findByMobile(mobile);
    const otpModeMap = {
        login: otpMode_enum_1.OtpMode.LOGIN,
        register: otpMode_enum_1.OtpMode.REGISTER,
        profile_update: otpMode_enum_1.OtpMode.PROFILE_UPDATE,
        forgot_password: otpMode_enum_1.OtpMode.FORGOT_PASSWORD,
    };
    const otpMode = otpModeMap[mode] || otpMode_enum_1.OtpMode.LOGIN;
    if (mode === 'login') {
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.login.mobileNotFound'));
        }
        // Check if user is active and not deleted before sending OTP
        if (existingUser.isDeleted || !existingUser.isActive) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        // If user has 'user' role and trying to login as academy, add academy role (keep user role)
        if (hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            const updatedUser = await user_service_1.userService.update(existingUser.id, {
                role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                addRole: true,
            });
            if (updatedUser) {
                // Refetch to get updated roles array
                const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                if (refetchedUser) {
                    existingUser = refetchedUser;
                }
            }
        }
        // Check if user has academy role (could be in roles array even if not first)
        if (!hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
    }
    else if (mode === 'register') {
        if (existingUser) {
            // If user exists as user, add academy role (keep user role) instead of throwing error
            if (hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.USER)) {
                const updatedUser = await user_service_1.userService.update(existingUser.id, {
                    role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                    addRole: true,
                });
                if (updatedUser) {
                    // Refetch to get updated roles array
                    const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                    if (refetchedUser) {
                        existingUser = refetchedUser;
                    }
                }
            }
            else {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.mobileExists'));
            }
        }
    }
    else if (mode === 'forgot_password') {
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // Check if user is active and not deleted before sending OTP
        if (existingUser.isDeleted || !existingUser.isActive) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
        if (hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            const updatedUser = await user_service_1.userService.update(existingUser.id, {
                role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                addRole: true,
            });
            if (updatedUser) {
                // Refetch to get updated roles array
                const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                if (refetchedUser) {
                    existingUser = refetchedUser;
                }
            }
        }
        // Check if user has academy role (could be in roles array even if not first)
        if (!hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
    }
    const isDemoAuth = env_1.config.demoAuth?.enabled && mobile === env_1.config.demoAuth.mobile;
    const otp = isDemoAuth
        ? env_1.config.demoAuth.otp
        : env_1.config.nodeEnv === 'development'
            ? '111111'
            : Math.floor(100000 + Math.random() * 900000).toString();
    await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
    // add +91 to the mobile number
    const mobileNumber = `+91${mobile}`;
    const expiryMinutes = env_1.config.otp.expiryMinutes;
    if (!isDemoAuth) {
        (0, notificationQueue_service_1.queueSms)(mobileNumber, `Your Play A Sport Academy OTP is ${otp} . This OTP will expire in ${expiryMinutes} minutes. Do not share this OTP with anyone. Play A Team Thank You.`, 'high', { type: 'otp' });
    }
    return {
        mobile: mobileNumber,
        mode,
    };
};
exports.sendAcademyOtp = sendAcademyOtp;
/**
 * Verify OTP
 */
const verifyAcademyOtp = async (data) => {
    const { mobile, otp, mode = 'login' } = data;
    const otpModeMap = {
        login: otpMode_enum_1.OtpMode.LOGIN,
        register: otpMode_enum_1.OtpMode.REGISTER,
        profile_update: otpMode_enum_1.OtpMode.PROFILE_UPDATE,
        forgot_password: otpMode_enum_1.OtpMode.FORGOT_PASSWORD,
    };
    const otpMode = otpModeMap[mode] || otpMode_enum_1.OtpMode.LOGIN;
    const status = await otp_service_1.otpService.verifyOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
    if (status !== 'valid') {
        const messageMap = {
            not_found: mode === 'register'
                ? (0, i18n_1.t)('auth.register.otpResend')
                : mode === 'profile_update'
                    ? (0, i18n_1.t)('auth.profile.mobileVerificationFailed')
                    : mode === 'forgot_password'
                        ? (0, i18n_1.t)('auth.password.resetOtpInvalid')
                        : (0, i18n_1.t)('auth.login.otpNotFoundOrExpired'),
            consumed: (0, i18n_1.t)('auth.login.otpUsed'),
            expired: (0, i18n_1.t)('auth.login.otpExpired'),
            invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
        };
        throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
    }
    if (mode === 'login') {
        let user = await user_service_1.userService.findByMobile(mobile);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.login.mobileNotFound'));
        }
        // If user has 'user' role and trying to login as academy, add academy role (keep user role)
        if (hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) && !hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            const updatedUser = await user_service_1.userService.update(user.id, {
                role: defaultRoles_enum_1.DefaultRoles.ACADEMY,
                addRole: true,
            });
            if (updatedUser) {
                user = await user_service_1.userService.findByMobile(mobile);
                if (!user) {
                    throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
                }
            }
        }
        // Check if user has academy role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        if (!user.isActive || user.isDeleted) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        // Generate tokens with device-specific expiry and store refresh token
        const deviceData = data;
        const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, defaultRoles_enum_1.DefaultRoles.ACADEMY, {
            fcmToken: deviceData.fcmToken ?? undefined,
            deviceType: deviceData.deviceType,
            deviceId: deviceData.deviceId ?? undefined,
            deviceName: deviceData.deviceName ?? undefined,
            appVersion: deviceData.appVersion ?? undefined,
        });
        return {
            user,
            accessToken,
            refreshToken,
        };
    }
    return {};
};
exports.verifyAcademyOtp = verifyAcademyOtp;
/**
 * Refresh access token using refresh token
 */
const refreshToken = async (token) => {
    if (!token) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.token.noToken'));
    }
    // Check if refresh token is blacklisted (including user-level blacklist)
    const { isTokenBlacklisted } = await Promise.resolve().then(() => __importStar(require('../../utils/tokenBlacklist')));
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
    }
    // Verify refresh token
    let decoded;
    try {
        decoded = (0, jwt_1.verifyRefreshToken)(token);
    }
    catch (error) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
    }
    // Check if user still exists and is active
    const user = await user_service_1.userService.findById(decoded.id);
    if (!user || !user.isActive || user.isDeleted) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
    }
    // Check if refresh token is linked to a device (for mobile apps)
    const deviceToken = decoded.deviceId
        ? await deviceToken_service_1.deviceTokenService.findDeviceByRefreshToken(token)
        : null;
    if (deviceToken && !deviceToken.isActive) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
    }
    const roleName = getRoleName(user);
    const deviceType = decoded.deviceType || deviceToken?.deviceType || 'web';
    // Generate new token pair with same device type
    const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.generateTokenPair)({
        id: user.id,
        email: user.email,
        role: roleName,
        deviceId: decoded.deviceId || deviceToken?.deviceId,
        deviceType,
    }, deviceType, decoded.deviceId || deviceToken?.deviceId);
    // If device token exists, update it with new refresh token
    if (deviceToken) {
        try {
            const decodedNew = jsonwebtoken_1.default.decode(newRefreshToken);
            const refreshTokenExpiresAt = decodedNew?.exp
                ? new Date(decodedNew.exp * 1000)
                : null;
            await deviceToken_service_1.deviceTokenService.updateDeviceRefreshToken(deviceToken.id, newRefreshToken, refreshTokenExpiresAt || new Date());
        }
        catch (error) {
            logger_1.logger.error('Failed to update device refresh token', {
                error: error instanceof Error ? error.message : error,
                deviceId: deviceToken.id,
            });
        }
    }
    // Blacklist old refresh token
    await (0, tokenBlacklist_1.blacklistToken)(token);
    return {
        accessToken,
        refreshToken: newRefreshToken,
    };
};
exports.refreshToken = refreshToken;
/**
 * Logout user - blacklist current tokens
 */
const logout = async (userId, accessToken, refreshToken) => {
    if (accessToken) {
        // Blacklist the access token
        await (0, tokenBlacklist_1.blacklistToken)(accessToken);
    }
    // If refresh token is provided, blacklist it and revoke from device
    if (refreshToken) {
        await (0, tokenBlacklist_1.blacklistToken)(refreshToken);
        // Try to find and revoke device refresh token
        try {
            const deviceToken = await deviceToken_service_1.deviceTokenService.findDeviceByRefreshToken(refreshToken);
            if (deviceToken) {
                await deviceToken_service_1.deviceTokenService.revokeDeviceRefreshToken(userId, deviceToken.id);
            }
        }
        catch (error) {
            // If device token not found or error, continue with blacklist
            logger_1.logger.debug('Device token not found for refresh token during logout', {
                userId,
            });
        }
    }
};
exports.logout = logout;
/**
 * Logout from all devices - blacklist all user tokens and revoke all device refresh tokens
 */
const logoutAll = async (userId) => {
    // Blacklist all tokens for this user (sets user-level blacklist flag)
    await (0, tokenBlacklist_1.blacklistUserTokens)(userId);
    // Get all active device tokens for this user to blacklist their refresh tokens
    try {
        const deviceTokens = await deviceToken_service_1.deviceTokenService.getUserDeviceTokens(userId);
        // Blacklist all refresh tokens from active devices
        for (const deviceToken of deviceTokens) {
            if (deviceToken.refreshToken) {
                try {
                    await (0, tokenBlacklist_1.blacklistToken)(deviceToken.refreshToken);
                    logger_1.logger.debug('Refresh token blacklisted during logout all', {
                        userId,
                        deviceId: deviceToken.deviceId,
                    });
                }
                catch (error) {
                    // Continue even if individual token blacklist fails
                    logger_1.logger.warn('Failed to blacklist refresh token during logout all', {
                        userId,
                        deviceId: deviceToken.deviceId,
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }
        }
    }
    catch (error) {
        // Log but continue - device token lookup failure shouldn't break logout
        logger_1.logger.warn('Failed to get device tokens during logout all', {
            userId,
            error: error instanceof Error ? error.message : error,
        });
    }
    // Revoke all device refresh tokens (deactivate devices and clear refresh tokens)
    await deviceToken_service_1.deviceTokenService.deactivateAllDeviceTokens(userId);
};
exports.logoutAll = logoutAll;
/**
 * Logout from a specific device by deviceToken id.
 * Blacklists the device's refresh token and deactivates the device record.
 */
const logoutDevice = async (userId, deviceTokenId) => {
    const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
    if (!userObjectId) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    const device = await deviceToken_model_1.DeviceTokenModel.findOne({
        id: deviceTokenId,
        userId: userObjectId,
        isActive: true,
    }).lean();
    if (!device) {
        return false;
    }
    if (device.refreshToken) {
        try {
            // Blacklist the refresh token itself
            await (0, tokenBlacklist_1.blacklistToken)(device.refreshToken);
            // Decode the refresh token to extract the shared JTI and blacklist it.
            // This instantly invalidates the matching access token as well.
            const decoded = jsonwebtoken_1.default.decode(device.refreshToken);
            if (decoded?.jti) {
                const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : undefined;
                await (0, tokenBlacklist_1.blacklistJti)(decoded.jti, ttl && ttl > 0 ? ttl : undefined);
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to blacklist tokens during device logout', {
                userId,
                deviceTokenId,
                error: error instanceof Error ? error.message : error,
            });
        }
    }
    // Remove old inactive records for same user+device to avoid unique index conflicts
    if (device.deviceId) {
        await deviceToken_model_1.DeviceTokenModel.deleteMany({
            userId: userObjectId,
            deviceId: device.deviceId,
            isActive: false,
        });
    }
    await deviceToken_model_1.DeviceTokenModel.updateOne({ id: deviceTokenId }, {
        $set: {
            isActive: false,
            refreshToken: null,
            refreshTokenExpiresAt: null,
        },
    });
    logger_1.logger.info('Device logged out', { userId, deviceTokenId, deviceId: device.deviceId });
    return true;
};
exports.logoutDevice = logoutDevice;
// ==================== USER AUTH FUNCTIONS ====================
/**
 * Register a new user (student or guardian)
 */
const registerUser = async (data) => {
    const { firstName, lastName, email, mobile, dob, gender, otp, tempToken, type } = data;
    // Generate a random password since users don't set passwords (OTP-based auth only)
    const randomPassword = `${(0, uuid_1.v4)()}!User${Math.floor(Math.random() * 1000)}`;
    // Check if email already exists before OTP verification
    const existingUser = await user_service_1.userService.findByEmail(email);
    // If user exists with USER role, throw error immediately
    if (existingUser) {
        const existingRoles = existingUser.roles;
        const existingRoleName = existingRoles && existingRoles.length > 0 ? existingRoles[0]?.name : null;
        if (existingRoleName === defaultRoles_enum_1.DefaultRoles.USER) {
            // User already has the user role, return error immediately
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.emailExists'));
        }
    }
    let verifiedMobile;
    // Verify temporary registration token (issued after OTP verification)
    if (tempToken) {
        // When using tempToken, OTP is not needed - tempToken already verifies OTP was validated
        // Extract mobile number from tempToken for security (don't trust frontend)
        try {
            const decoded = (0, jwt_1.verifyTempRegistrationToken)(tempToken);
            verifiedMobile = decoded.mobile; // Use mobile from token, not from request body
            // tempToken is valid - proceed with registration (OTP already verified when tempToken was issued)
        }
        catch (error) {
            if (error instanceof ApiError_1.ApiError) {
                throw error;
            }
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.invalidTempToken'));
        }
    }
    else if (otp) {
        // Legacy support: if OTP is provided (and no tempToken), verify it (for backward compatibility)
        if (!mobile) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.mobileNumber.required') || 'Mobile number is required when using OTP');
        }
        const otpStatus = await otp_service_1.otpService.verifyOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode_enum_1.OtpMode.REGISTER);
        if (otpStatus !== 'valid') {
            const messageMap = {
                not_found: (0, i18n_1.t)('auth.login.invalidOtp'),
                consumed: (0, i18n_1.t)('auth.login.otpUsed'),
                expired: (0, i18n_1.t)('auth.login.otpExpired'),
                invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
            };
            throw new ApiError_1.ApiError(400, messageMap[otpStatus] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
        }
        verifiedMobile = mobile; // Use mobile from request for legacy flow
    }
    else {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.otp.required') || 'Either tempToken or otp is required');
    }
    // Check if mobile number already exists for USER role
    // Only throw error if it's a different user (not the same user found by email)
    const existingUserByMobile = await user_service_1.userService.findByMobile(verifiedMobile);
    if (existingUserByMobile && hasRole(existingUserByMobile, defaultRoles_enum_1.DefaultRoles.USER)) {
        // Allow if it's the same user (found by email) - we'll just update that user
        if (!existingUser || existingUserByMobile.id !== existingUser.id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.mobileExists'));
        }
    }
    let user;
    if (existingUser) {
        // User exists, check if they are registered as academy
        const existingRoles = existingUser.roles;
        const existingRoleName = existingRoles && existingRoles.length > 0 ? existingRoles[0]?.name : null;
        if (existingRoleName === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
            // If user is academy, add user role (keep academy role)
            const updatedUser = await user_service_1.userService.update(existingUser.id, {
                role: defaultRoles_enum_1.DefaultRoles.USER,
                addRole: true,
                userType: type || null,
            });
            if (!updatedUser) {
                throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
            }
            user = updatedUser;
        }
        else {
            // User exists with different role, add user role (keep existing role)
            const updatedUser = await user_service_1.userService.update(existingUser.id, {
                role: defaultRoles_enum_1.DefaultRoles.USER,
                addRole: true,
                userType: type || null,
            });
            if (!updatedUser) {
                throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
            }
            user = updatedUser;
        }
    }
    else {
        // Create new user
        user = await user_service_1.userService.create({
            id: (0, uuid_1.v4)(),
            email,
            password: randomPassword, // Random password since users don't set passwords (OTP-based auth only)
            firstName,
            lastName,
            mobile: verifiedMobile,
            role: defaultRoles_enum_1.DefaultRoles.USER,
            userType: type || null, // Set userType when role is 'user'
            registrationMethod: 'mobile', // User registration uses mobile OTP
            dob: dob ? new Date(dob) : null,
            gender: gender,
            isActive: true,
        });
    }
    // Get role name from populated roles array
    const roles = user.roles;
    const roleName = roles && roles.length > 0 ? roles[0]?.name : defaultRoles_enum_1.DefaultRoles.USER;
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, roleName, {
        fcmToken: data.fcmToken ?? undefined,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? undefined,
        deviceName: data.deviceName ?? undefined,
        appVersion: data.appVersion ?? undefined,
    });
    // Send notification email to admin when new user registers
    if (env_1.config.admin.email && !existingUser) {
        try {
            const fullName = lastName ? `${firstName} ${lastName}` : firstName;
            const registrationDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, 'New User Registration - PlayAsport', {
                template: 'user-registration-admin.html',
                templateVariables: {
                    name: fullName,
                    email: email,
                    mobile: verifiedMobile ? `+91${verifiedMobile}` : 'Not provided',
                    userType: type || 'Not specified',
                    gender: gender || 'Not specified',
                    registrationDate,
                    userId: user.id,
                    year: new Date().getFullYear(),
                },
                priority: 'high',
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to queue user registration admin email', { error });
        }
    }
    // Create notification for admin and super_admin when new user registers (fire-and-forget)
    if (!existingUser) {
        // Don't await - let it run in background to avoid blocking registration response
        (async () => {
            try {
                const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
                const fullName = lastName ? `${firstName} ${lastName}` : firstName;
                const pushNotification = (0, notificationMessages_1.getNewUserRegistrationAdminPush)({
                    userName: fullName,
                    userEmail: email,
                    userType: type || 'user',
                });
                await createAndSendNotification({
                    recipientType: 'role',
                    roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
                    title: pushNotification.title,
                    body: pushNotification.body,
                    channels: ['push'],
                    priority: 'medium',
                    data: {
                        type: 'user_registration',
                        userId: user.id,
                        email: email,
                        userType: type || 'user',
                    },
                    metadata: {
                        source: 'user_registration',
                        registrationDate: new Date().toISOString(),
                    },
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to create user registration notification', { error });
                // Don't throw error - notification failure shouldn't break registration
            }
        })();
    }
    // Remove unwanted fields from user object before returning
    const userObj = user;
    const { isDeleted, deletedAt, createdAt, updatedAt, roles: _roles, ...sanitizedUser } = userObj;
    return {
        user: sanitizedUser,
        accessToken,
        refreshToken,
    };
};
exports.registerUser = registerUser;
/**
 * Login user with email and password
 */
const loginUser = async (data) => {
    const { email, password } = data;
    let user = await user_service_1.userService.findByEmailWithPassword(email);
    if (!user || !user.password) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
    }
    // Check password first
    const isPasswordValid = await (0, utils_1.comparePassword)(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
    }
    const roles = user.roles;
    let userRole = roles && roles.length > 0 ? roles[0]?.name : null;
    // If user is registered as academy and trying to login as user, add user role (keep academy role)
    if (userRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
        // Add user role to existing roles array (don't replace academy role)
        const updatedUser = await user_service_1.userService.update(user.id, {
            role: defaultRoles_enum_1.DefaultRoles.USER,
            addRole: true,
        });
        if (updatedUser) {
            user = await user_service_1.userService.findByEmailWithPassword(email);
            if (!user) {
                throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
            }
            const updatedRoles = user.roles;
            // Check if user has user role (could be first or second in array)
            const hasUserRole = updatedRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.USER);
            userRole = hasUserRole ? defaultRoles_enum_1.DefaultRoles.USER : (updatedRoles[0]?.name || defaultRoles_enum_1.DefaultRoles.USER);
        }
    }
    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (!user.isActive || user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    // Refresh user data to get updated role
    const updatedUserData = await user_service_1.userService.findByEmail(email);
    const sanitizedUser = updatedUserData || user_service_1.userService.sanitize(user);
    if (!sanitizedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, userRole ?? defaultRoles_enum_1.DefaultRoles.USER, {
        fcmToken: data.fcmToken ?? undefined,
        deviceType: data.deviceType,
        deviceId: data.deviceId ?? undefined,
        deviceName: data.deviceName ?? undefined,
        appVersion: data.appVersion ?? undefined,
    });
    return {
        user: sanitizedUser,
        accessToken,
        refreshToken,
    };
};
exports.loginUser = loginUser;
/**
 * Social login for user
 */
const socialLoginUser = async (data) => {
    const payload = data;
    const decodedToken = await firebaseAuth_service_1.firebaseAuthService.verifyIdToken(payload.idToken);
    const email = decodedToken.email?.toLowerCase();
    if (!email) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.social.missingEmail'));
    }
    let user = await user_service_1.userService.findByEmail(email);
    if (!user) {
        const nameFromToken = decodedToken.name ?? '';
        const [tokenFirstName, ...tokenLastParts] = nameFromToken.trim().split(/\s+/).filter(Boolean);
        const firstName = payload.firstName?.trim() ||
            tokenFirstName ||
            'User';
        const lastName = payload.lastName?.trim() ||
            (tokenLastParts.length ? tokenLastParts.join(' ') : decodedToken.family_name || null) ||
            null;
        // Determine registration method from provider
        const provider = payload.provider?.toLowerCase() || decodedToken.firebase?.sign_in_provider?.toLowerCase() || 'google';
        let registrationMethod = 'google';
        if (provider.includes('google')) {
            registrationMethod = 'google';
        }
        else if (provider.includes('facebook')) {
            registrationMethod = 'facebook';
        }
        else if (provider.includes('apple')) {
            registrationMethod = 'apple';
        }
        else if (provider.includes('instagram')) {
            registrationMethod = 'instagram';
        }
        user = await user_service_1.userService.create({
            id: (0, uuid_1.v4)(),
            email,
            firstName,
            lastName,
            password: `${(0, uuid_1.v4)()}!Social1`,
            role: defaultRoles_enum_1.DefaultRoles.USER,
            userType: payload.type || null, // Set userType when role is 'user'
            registrationMethod,
            isActive: true,
        });
    }
    else {
        // User exists, if academy, add user role (keep academy role)
        const existingRoles = user.roles;
        const existingRole = existingRoles && existingRoles.length > 0 ? existingRoles[0]?.name : null;
        if (existingRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
            const updatedUser = await user_service_1.userService.update(user.id, {
                role: defaultRoles_enum_1.DefaultRoles.USER,
                addRole: true,
                userType: payload.type || null,
            });
            if (updatedUser) {
                user = await user_service_1.userService.findByEmail(email);
                if (!user) {
                    throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
                }
            }
        }
        else if (existingRole === defaultRoles_enum_1.DefaultRoles.USER && payload.type) {
            // Update userType if provided
            const updatedUser = await user_service_1.userService.update(user.id, { userType: payload.type });
            if (updatedUser) {
                user = updatedUser;
            }
        }
    }
    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (!user.isActive || user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    // Generate tokens with device-specific expiry and store refresh token
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, defaultRoles_enum_1.DefaultRoles.USER, {
        fcmToken: payload.fcmToken ?? undefined,
        deviceType: payload.deviceType,
        deviceId: payload.deviceId ?? undefined,
        deviceName: payload.deviceName ?? undefined,
        appVersion: payload.appVersion ?? undefined,
    });
    return {
        user,
        accessToken,
        refreshToken,
        provider: payload.provider ?? decodedToken.firebase?.sign_in_provider,
    };
};
exports.socialLoginUser = socialLoginUser;
/**
 * Update user profile
 */
const updateUserProfile = async (userId, data, file) => {
    const existingUser = await user_service_1.userService.findById(userId);
    if (!existingUser) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const updates = {};
    if (data.firstName) {
        updates.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
        updates.lastName = data.lastName ?? null;
    }
    if (data.email) {
        // Check if email already exists for another user
        const emailLower = data.email.toLowerCase();
        if (emailLower !== existingUser.email.toLowerCase()) {
            const emailExists = await user_service_1.userService.findByEmail(emailLower);
            if (emailExists && emailExists.id !== userId) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.emailExists'));
            }
        }
        updates.email = emailLower;
    }
    if (data.dob) {
        updates.dob = new Date(data.dob);
    }
    if (data.gender) {
        updates.gender = data.gender;
    }
    // Handle profile image upload
    if (file) {
        try {
            logger_1.logger.info('Starting profile image upload', {
                userId: existingUser.id,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            });
            // Delete old profile image if exists
            if (existingUser.profileImage) {
                try {
                    await (0, s3_service_1.deleteFileFromS3)(existingUser.profileImage);
                    logger_1.logger.info('Old profile image deleted', { oldImageUrl: existingUser.profileImage });
                }
                catch (deleteError) {
                    logger_1.logger.warn('Failed to delete old profile image, continuing with upload', deleteError);
                    // Don't fail the upload if deletion fails
                }
            }
            // Upload new image to S3
            const imageUrl = await (0, s3_service_1.uploadFileToS3)({
                file,
                folder: 'users',
                userId: existingUser.id,
            });
            updates.profileImage = imageUrl;
            logger_1.logger.info('Profile image uploaded successfully', { imageUrl, userId: existingUser.id });
        }
        catch (error) {
            logger_1.logger.error('Failed to upload profile image', {
                error: error?.message || error,
                stack: error?.stack,
                userId: existingUser.id,
                fileName: file?.originalname,
            });
            throw new ApiError_1.ApiError(500, error?.message || (0, i18n_1.t)('auth.profile.imageUploadFailed'));
        }
    }
    if (!Object.keys(updates).length && !file) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.profile.noChanges'));
    }
    const updatedUser = await user_service_1.userService.update(existingUser.id, updates);
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    return updatedUser;
};
exports.updateUserProfile = updateUserProfile;
/**
 * Update user address
 */
const updateUserAddress = async (userId, data) => {
    const existingUser = await user_service_1.userService.findById(userId);
    if (!existingUser) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const updatedUser = await user_service_1.userService.update(existingUser.id, {
        address: {
            ...data.address,
            isDeleted: false,
        },
    });
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    return updatedUser;
};
exports.updateUserAddress = updateUserAddress;
/**
 * Change user password
 */
const changeUserPassword = async (userId, data) => {
    const { currentPassword, newPassword } = data;
    const user = await user_service_1.userService.findByIdWithPassword(userId);
    if (!user || !user.password) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    const isCurrentValid = await (0, utils_1.comparePassword)(currentPassword, user.password);
    if (!isCurrentValid) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.profile.invalidCurrentPassword'));
    }
    await user_service_1.userService.update(user.id, { password: newPassword });
};
exports.changeUserPassword = changeUserPassword;
/**
 * Request password reset OTP for user
 */
const requestUserPasswordReset = async (data) => {
    const otp = env_1.config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
    if (data.mode === 'mobile') {
        const user = await user_service_1.userService.findByMobile(data.mobile);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // Check if user has user role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: data.mobile }, otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
        const mobileNumber = `+91${data.mobile}`;
        (0, notificationQueue_service_1.queueSms)(mobileNumber, (0, notificationMessages_1.getOtpSms)({ otp }), 'high', { type: 'otp' });
    }
    else {
        const emailLower = data.email.toLowerCase();
        const user = await user_service_1.userService.findByEmail(emailLower);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // Check if user has user role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.EMAIL, identifier: emailLower }, otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
        await (0, email_service_1.sendPasswordResetEmail)(emailLower, otp, {
            name: user.firstName || 'User',
        });
    }
    return { mode: data.mode };
};
exports.requestUserPasswordReset = requestUserPasswordReset;
/**
 * Verify password reset OTP and reset password for user
 */
const verifyUserPasswordReset = async (data) => {
    const identifier = data.mode === 'mobile' ? data.mobile : data.email.toLowerCase();
    const channel = data.mode === 'mobile' ? otpChannel_enum_1.OtpChannel.MOBILE : otpChannel_enum_1.OtpChannel.EMAIL;
    const status = await otp_service_1.otpService.verifyOtp({ channel, identifier }, data.otp, otpMode_enum_1.OtpMode.FORGOT_PASSWORD);
    if (status !== 'valid') {
        const messageMap = {
            not_found: (0, i18n_1.t)('auth.password.resetOtpInvalid'),
            consumed: (0, i18n_1.t)('auth.login.otpUsed'),
            expired: (0, i18n_1.t)('auth.login.otpExpired'),
            invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
        };
        throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
    }
    const user = data.mode === 'mobile'
        ? await user_service_1.userService.findByMobile(data.mobile)
        : await user_service_1.userService.findByEmail(identifier);
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
    }
    // Check if user has 'user' role (could be in roles array even if not first)
    if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    // Validate userType for user role
    if (user.userType !== 'student' && user.userType !== 'guardian') {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    const updatedUser = await user_service_1.userService.update(user.id, {
        password: data.newPassword,
    });
    if (!updatedUser) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    // Generate tokens with device-specific expiry and store refresh token
    const deviceData = data;
    const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(updatedUser, getRoleName(updatedUser), {
        fcmToken: deviceData.fcmToken ?? undefined,
        deviceType: deviceData.deviceType,
        deviceId: deviceData.deviceId ?? undefined,
        deviceName: deviceData.deviceName ?? undefined,
        appVersion: deviceData.appVersion ?? undefined,
    });
    return {
        user: updatedUser,
        accessToken,
        refreshToken,
    };
};
exports.verifyUserPasswordReset = verifyUserPasswordReset;
/**
 * Get current user
 * Optimized: Excludes roles, isDeleted, updatedAt and populates favoriteSports
 */
const getCurrentUser = async (userId) => {
    const { UserModel } = await Promise.resolve().then(() => __importStar(require('../../models/user.model')));
    const { SportModel } = await Promise.resolve().then(() => __importStar(require('../../models/sport.model')));
    const user = await UserModel.findOne({ id: userId })
        .select({
        _id: 0,
        password: 0,
        roles: 0, // Exclude roles
        isDeleted: 0, // Exclude isDeleted
        deletedAt: 0, // Exclude deletedAt
        updatedAt: 0, // Exclude updatedAt
        registrationMethod: 0, // Exclude registrationMethod
        academyDetails: 0, // Exclude academyDetails
    })
        .lean();
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
    }
    // Store original favoriteSports array before transforming (extract it from user object)
    const originalFavoriteSports = user.favoriteSports;
    // Transform the user object to ensure id field is present, excluding favoriteSports
    const { favoriteSports: _favoriteSports, ...userWithoutFavoriteSports } = user;
    const userResponse = {
        ...userWithoutFavoriteSports,
        id: user.id || user._id?.toString(),
    };
    // Remove any remaining unwanted fields
    delete userResponse._id;
    delete userResponse.password;
    delete userResponse.roles;
    delete userResponse.isDeleted;
    delete userResponse.deletedAt;
    delete userResponse.updatedAt;
    delete userResponse.registrationMethod;
    delete userResponse.academyDetails;
    // Manually populate favoriteSports with sport details
    if (originalFavoriteSports && Array.isArray(originalFavoriteSports) && originalFavoriteSports.length > 0) {
        try {
            const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
            // Convert ObjectIds to proper format for querying
            const sportIds = originalFavoriteSports
                .map((id) => {
                // Handle string ObjectIds
                if (typeof id === 'string') {
                    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
                }
                // Handle ObjectId objects
                if (id && typeof id === 'object' && id.toString) {
                    return Types.ObjectId.isValid(id.toString()) ? new Types.ObjectId(id.toString()) : null;
                }
                return null;
            })
                .filter((id) => id !== null);
            if (sportIds.length > 0) {
                // Fetch sports by their MongoDB _id
                const sports = await SportModel.find({
                    _id: { $in: sportIds }
                })
                    .select('_id custom_id name logo')
                    .lean();
                // Map sports to the expected format; id = MongoDB _id (string)
                const sportMap = new Map(sports.map((sport) => [sport._id.toString(), {
                        id: sport._id.toString() || sport.custom_id,
                        name: sport.name,
                        logo: sport.logo || null,
                    }]));
                // Maintain original order from originalFavoriteSports
                userResponse.favoriteSports = originalFavoriteSports
                    .map((id) => {
                    const idStr = typeof id === 'string' ? id : id?.toString();
                    return sportMap.get(idStr);
                })
                    .filter((sport) => sport !== undefined);
            }
            else {
                userResponse.favoriteSports = [];
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to populate favorite sports', {
                userId,
                error: error instanceof Error ? error.message : error,
            });
            // If population fails, return empty array
            userResponse.favoriteSports = [];
        }
    }
    else {
        // Ensure favoriteSports is always an array
        userResponse.favoriteSports = [];
    }
    return userResponse;
};
exports.getCurrentUser = getCurrentUser;
/**
 * Send OTP to mobile number for user
 */
const sendUserOtp = async (data) => {
    const { mobile, mode = 'login' } = data;
    let existingUser = await user_service_1.userService.findByMobile(mobile);
    const otpModeMap = {
        login: otpMode_enum_1.OtpMode.LOGIN,
        register: otpMode_enum_1.OtpMode.REGISTER,
        profile_update: otpMode_enum_1.OtpMode.PROFILE_UPDATE,
        forgot_password: otpMode_enum_1.OtpMode.FORGOT_PASSWORD,
    };
    const otpMode = otpModeMap[mode] || otpMode_enum_1.OtpMode.LOGIN;
    if (mode === 'login') {
        // Allow sending OTP even if user doesn't exist - we'll handle that in verifyUserOtp
        if (existingUser) {
            // Check if user is active and not deleted before sending OTP
            if (existingUser.isDeleted || !existingUser.isActive) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
            }
            let userRole = getRoleName(existingUser);
            // If user is registered as academy and trying to login as user, add user role (keep academy role)
            if (userRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
                // Add user role to existing roles array (don't replace academy role)
                const updatedUser = await user_service_1.userService.update(existingUser.id, {
                    role: defaultRoles_enum_1.DefaultRoles.USER,
                    addRole: true,
                });
                if (updatedUser) {
                    // Refetch to get updated roles array
                    const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                    if (refetchedUser) {
                        existingUser = refetchedUser;
                        const updatedRoles = existingUser.roles;
                        // Check if user has user role
                        const hasUserRole = updatedRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.USER);
                        userRole = hasUserRole ? defaultRoles_enum_1.DefaultRoles.USER : userRole;
                    }
                }
            }
            // Check if user has user role (could be in roles array even if not first)
            if (!hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.USER)) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
        }
        // If user doesn't exist, we'll still send OTP and handle registration in verifyUserOtp
    }
    else if (mode === 'register') {
        if (existingUser) {
            // If user exists as academy, add user role (keep academy role) instead of throwing error
            const existingRole = getRoleName(existingUser);
            if (existingRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
                const updatedUser = await user_service_1.userService.update(existingUser.id, {
                    role: defaultRoles_enum_1.DefaultRoles.USER,
                    addRole: true,
                });
                if (updatedUser) {
                    // Refetch to get updated roles array
                    const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                    if (refetchedUser) {
                        existingUser = refetchedUser;
                    }
                }
            }
            else {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.mobileExists'));
            }
        }
    }
    else if (mode === 'forgot_password') {
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        // Check if user is active and not deleted before sending OTP
        if (existingUser.isDeleted || !existingUser.isActive) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        let userRole = getRoleName(existingUser);
        // If user is registered as academy, add user role (keep academy role)
        if (userRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
            const updatedUser = await user_service_1.userService.update(existingUser.id, {
                role: defaultRoles_enum_1.DefaultRoles.USER,
                addRole: true,
            });
            if (updatedUser) {
                // Refetch to get updated roles array
                const refetchedUser = await user_service_1.userService.findByMobile(mobile);
                if (refetchedUser) {
                    existingUser = refetchedUser;
                    const updatedRoles = existingUser.roles;
                    // Check if user has user role
                    const hasUserRole = updatedRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.USER);
                    userRole = hasUserRole ? defaultRoles_enum_1.DefaultRoles.USER : userRole;
                }
            }
        }
        // Check if user has user role (could be in roles array even if not first)
        if (!hasRole(existingUser, defaultRoles_enum_1.DefaultRoles.USER)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
    }
    const isDemoAuth = env_1.config.demoAuth?.enabled && mobile === env_1.config.demoAuth.mobile;
    const otp = isDemoAuth
        ? env_1.config.demoAuth.otp
        : env_1.config.nodeEnv === 'development'
            ? '111111'
            : Math.floor(100000 + Math.random() * 900000).toString();
    await otp_service_1.otpService.createOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
    // add +91 to the mobile number
    const mobileNumber = `+91${mobile}`;
    const expiryMinutes = env_1.config.otp.expiryMinutes;
    if (!isDemoAuth) {
        (0, notificationQueue_service_1.queueSms)(mobileNumber, `Your Play A Sport Academy OTP is ${otp} . This OTP will expire in ${expiryMinutes} minutes. Do not share this OTP with anyone. Play A Team Thank You.`, 'high', { type: 'otp' });
    }
    return {
        mobile: mobileNumber,
        mode,
    };
};
exports.sendUserOtp = sendUserOtp;
/**
 * Verify OTP for user
 */
const verifyUserOtp = async (data) => {
    const { mobile, otp, mode = 'login' } = data;
    const otpModeMap = {
        login: otpMode_enum_1.OtpMode.LOGIN,
        register: otpMode_enum_1.OtpMode.REGISTER,
        profile_update: otpMode_enum_1.OtpMode.PROFILE_UPDATE,
        forgot_password: otpMode_enum_1.OtpMode.FORGOT_PASSWORD,
    };
    const otpMode = otpModeMap[mode] || otpMode_enum_1.OtpMode.LOGIN;
    const status = await otp_service_1.otpService.verifyOtp({ channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
    if (status !== 'valid') {
        const messageMap = {
            not_found: mode === 'register'
                ? (0, i18n_1.t)('auth.register.otpResend')
                : mode === 'profile_update'
                    ? (0, i18n_1.t)('auth.profile.mobileVerificationFailed')
                    : mode === 'forgot_password'
                        ? (0, i18n_1.t)('auth.password.resetOtpInvalid')
                        : (0, i18n_1.t)('auth.login.otpNotFoundOrExpired'),
            consumed: (0, i18n_1.t)('auth.login.otpUsed'),
            expired: (0, i18n_1.t)('auth.login.otpExpired'),
            invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
        };
        throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
    }
    if (mode === 'login') {
        let user = await user_service_1.userService.findByMobile(mobile);
        if (!user) {
            // User doesn't exist - return flag and temporary token for registration
            const tempToken = (0, jwt_1.generateTempRegistrationToken)(mobile);
            return {
                needsRegistration: true,
                tempToken,
            };
        }
        let userRole = getRoleName(user);
        // If user is registered as academy and trying to login as user, add user role (keep academy role)
        if (userRole === defaultRoles_enum_1.DefaultRoles.ACADEMY) {
            // Add user role to existing roles array (don't replace academy role)
            const updatedUser = await user_service_1.userService.update(user.id, {
                role: defaultRoles_enum_1.DefaultRoles.USER,
                addRole: true,
            });
            if (updatedUser) {
                // Use updatedUser directly instead of refetching - eliminates unnecessary DB query
                user = updatedUser;
                const updatedRoles = user.roles;
                // Check if user has user role
                const hasUserRole = updatedRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.USER);
                userRole = hasUserRole ? defaultRoles_enum_1.DefaultRoles.USER : userRole;
            }
        }
        // Check if user has user role (could be in roles array even if not first)
        if (!hasRole(user, defaultRoles_enum_1.DefaultRoles.USER)) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        if (!user.isActive || user.isDeleted) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        // Use user role for token (even if academy is first in array)
        const userRoleForToken = hasRole(user, defaultRoles_enum_1.DefaultRoles.USER) ? defaultRoles_enum_1.DefaultRoles.USER : getRoleName(user);
        // Generate tokens with device-specific expiry and store refresh token
        const deviceData = data;
        const { accessToken, refreshToken } = await generateTokensAndStoreDeviceToken(user, userRoleForToken, {
            fcmToken: deviceData.fcmToken ?? undefined,
            deviceType: deviceData.deviceType,
            deviceId: deviceData.deviceId ?? undefined,
            deviceName: deviceData.deviceName ?? undefined,
            appVersion: deviceData.appVersion ?? undefined,
        });
        // Remove unwanted fields from user object before returning
        const userObj = user;
        const { isDeleted, deletedAt, createdAt, updatedAt, roles: _roles, ...sanitizedUser } = userObj;
        return {
            user: sanitizedUser,
            accessToken,
            refreshToken,
        };
    }
    return {};
};
exports.verifyUserOtp = verifyUserOtp;
//# sourceMappingURL=auth.service.js.map