"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.logout = exports.refreshToken = exports.verifyAcademyOtp = exports.sendAcademyOtp = exports.getCurrentAcademyUser = exports.verifyAcademyPasswordReset = exports.requestAcademyPasswordReset = exports.changeAcademyPassword = exports.updateAcademyAddress = exports.updateAcademyProfile = exports.socialLoginAcademyUser = exports.loginAcademyUser = exports.registerAcademyUser = void 0;
const uuid_1 = require("uuid");
const i18n_1 = require("../utils/i18n");
const user_service_1 = require("../services/user.service");
const role_model_1 = require("../models/role.model");
const utils_1 = require("../utils");
const jwt_1 = require("../utils/jwt");
const tokenBlacklist_1 = require("../utils/tokenBlacklist");
const sms_service_1 = require("../services/sms.service");
const email_service_1 = require("../services/email.service");
const otp_service_1 = require("../services/otp.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const logger_1 = require("../utils/logger");
const firebaseAuth_service_1 = require("../services/firebaseAuth.service");
const s3_service_1 = require("../services/s3.service");
const registerAcademyUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, mobile, otp } = req.body;
        if (!otp) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.otp.required'));
        }
        const otpStatus = await otp_service_1.otpService.verifyOtp({ channel: 'mobile', identifier: mobile }, otp, 'register');
        if (otpStatus !== 'valid') {
            const messageMap = {
                not_found: (0, i18n_1.t)('auth.login.invalidOtp'),
                consumed: (0, i18n_1.t)('auth.login.otpUsed'),
                expired: (0, i18n_1.t)('auth.login.otpExpired'),
                invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
            };
            throw new ApiError_1.ApiError(400, messageMap[otpStatus] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
        }
        const existingUser = await user_service_1.userService.findByEmail(email);
        if (existingUser) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.emailExists'));
        }
        const user = await user_service_1.userService.create({
            id: (0, uuid_1.v4)(),
            email,
            password,
            firstName,
            lastName,
            mobile,
            role: role_model_1.DefaultRoles.ACADEMY,
            isActive: true,
        });
        const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
            id: user.id,
            email: user.email,
            role: user.role?.id ?? role_model_1.DefaultRoles.USER,
        });
        const response = new ApiResponse_1.ApiResponse(201, {
            user,
            accessToken,
            refreshToken,
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
        const { email, password } = req.body;
        const user = await user_service_1.userService.findByEmailWithPassword(email);
        if (!user || !user.password) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
        }
        if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        if (!user.isActive || user.isDeleted) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        const isPasswordValid = await (0, utils_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
        }
        const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
            id: user.id,
            email: user.email,
            role: user.role?.id ?? role_model_1.DefaultRoles.USER,
        });
        const response = new ApiResponse_1.ApiResponse(200, {
            user: user_service_1.userService.sanitize(user),
            accessToken,
            refreshToken,
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
            user = await user_service_1.userService.create({
                id: (0, uuid_1.v4)(),
                email,
                firstName,
                lastName,
                password: `${(0, uuid_1.v4)()}!Social1`,
                role: role_model_1.DefaultRoles.ACADEMY,
                isActive: true,
            });
        }
        if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        if (!user.isActive || user.isDeleted) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
        }
        const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
            id: user.id,
            email: user.email,
            role: user.role?.id ?? role_model_1.DefaultRoles.USER,
        });
        const response = new ApiResponse_1.ApiResponse(200, {
            user,
            accessToken,
            refreshToken,
            provider: payload.provider ?? decodedToken.firebase?.sign_in_provider,
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
        const existingUser = await user_service_1.userService.findById(req.user.id);
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
        }
        const updates = {};
        if (payload.firstName) {
            updates.firstName = payload.firstName;
        }
        if (payload.lastName !== undefined) {
            updates.lastName = payload.lastName ?? null;
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
        const existingUser = await user_service_1.userService.findById(req.user.id);
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
        }
        const updatedUser = await user_service_1.userService.update(existingUser.id, {
            address: {
                ...payload.address,
                isDeleted: false,
            },
        });
        if (!updatedUser) {
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
        }
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
        const { currentPassword, newPassword } = req.body;
        const user = await user_service_1.userService.findByIdWithPassword(req.user.id);
        if (!user || !user.password) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
        }
        const isCurrentValid = await (0, utils_1.comparePassword)(currentPassword, user.password);
        if (!isCurrentValid) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.profile.invalidCurrentPassword'));
        }
        await user_service_1.userService.update(user.id, { password: newPassword });
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
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        if (payload.mode === 'mobile') {
            const user = await user_service_1.userService.findByMobile(payload.mobile);
            if (!user) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
            }
            if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
            await otp_service_1.otpService.createOtp({ channel: 'mobile', identifier: payload.mobile }, otp, 'forgot_password');
            const mobileNumber = `+91${payload.mobile}`;
            await (0, sms_service_1.sendOtpSms)(mobileNumber, otp);
        }
        else {
            const emailLower = payload.email.toLowerCase();
            const user = await user_service_1.userService.findByEmail(emailLower);
            if (!user) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
            }
            if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
            await otp_service_1.otpService.createOtp({ channel: 'email', identifier: emailLower }, otp, 'forgot_password');
            await (0, email_service_1.sendPasswordResetEmail)(emailLower, otp, {
                name: user.firstName || 'User',
            });
        }
        const response = new ApiResponse_1.ApiResponse(200, { mode: payload.mode }, (0, i18n_1.t)('auth.password.resetOtpSent'));
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
        const identifier = payload.mode === 'mobile' ? payload.mobile : payload.email.toLowerCase();
        const channel = payload.mode === 'mobile' ? 'mobile' : 'email';
        const status = await otp_service_1.otpService.verifyOtp({ channel, identifier }, payload.otp, 'forgot_password');
        if (status !== 'valid') {
            const messageMap = {
                not_found: (0, i18n_1.t)('auth.password.resetOtpInvalid'),
                consumed: (0, i18n_1.t)('auth.login.otpUsed'),
                expired: (0, i18n_1.t)('auth.login.otpExpired'),
                invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
            };
            throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
        }
        const user = payload.mode === 'mobile'
            ? await user_service_1.userService.findByMobile(payload.mobile)
            : await user_service_1.userService.findByEmail(identifier);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
        }
        if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
        }
        const updatedUser = await user_service_1.userService.update(user.id, {
            password: payload.newPassword,
        });
        if (!updatedUser) {
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
        }
        const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role?.id ?? role_model_1.DefaultRoles.USER,
        });
        const response = new ApiResponse_1.ApiResponse(200, {
            user: updatedUser,
            accessToken,
            refreshToken,
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
        const user = await user_service_1.userService.findById(req.user.id);
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.profile.notFound'));
        }
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
        const existingUser = await user_service_1.userService.findByMobile(mobile);
        if (mode === 'login') {
            if (!existingUser) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.login.mobileNotFound'));
            }
            if (existingUser.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
        }
        else if (mode === 'register') {
            if (existingUser) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.register.mobileExists'));
            }
        }
        else if (mode === 'forgot_password') {
            if (!existingUser) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.password.resetUserNotFound'));
            }
            if (existingUser.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await otp_service_1.otpService.createOtp({ channel: 'mobile', identifier: mobile }, otp, mode);
        // add +91 to the mobile number
        const mobileNumber = `+91${mobile}`;
        await (0, sms_service_1.sendOtpSms)(mobileNumber, otp);
        const response = new ApiResponse_1.ApiResponse(200, {
            mobile: mobileNumber,
            mode,
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
        const status = await otp_service_1.otpService.verifyOtp({ channel: 'mobile', identifier: mobile }, otp, mode);
        if (status !== 'valid') {
            const messageMap = {
                not_found: mode === 'register'
                    ? (0, i18n_1.t)('auth.register.otpResend')
                    : mode === 'profile_update'
                        ? (0, i18n_1.t)('auth.profile.mobileVerificationFailed')
                        : mode === 'forgot_password'
                            ? (0, i18n_1.t)('auth.password.resetOtpInvalid')
                            : (0, i18n_1.t)('auth.login.mobileNotFound'),
                consumed: (0, i18n_1.t)('auth.login.otpUsed'),
                expired: (0, i18n_1.t)('auth.login.otpExpired'),
                invalid: (0, i18n_1.t)('auth.login.invalidOtp'),
            };
            throw new ApiError_1.ApiError(400, messageMap[status] ?? (0, i18n_1.t)('auth.login.invalidOtp'));
        }
        if (mode === 'login') {
            const user = await user_service_1.userService.findByMobile(mobile);
            if (!user) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.login.mobileNotFound'));
            }
            if (user.role?.id !== role_model_1.DefaultRoles.ACADEMY) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
            }
            if (!user.isActive || user.isDeleted) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
            }
            const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
                id: user.id,
                email: user.email,
                role: user.role?.id ?? role_model_1.DefaultRoles.USER,
            });
            const response = new ApiResponse_1.ApiResponse(200, {
                user,
                accessToken,
                refreshToken,
            }, (0, i18n_1.t)('auth.login.success'));
            res.json(response);
            return;
        }
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
        if (!token) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.token.noToken'));
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
        // Generate new token pair
        const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.generateTokenPair)({
            id: user.id,
            email: user.email,
            role: user.role?.id ?? role_model_1.DefaultRoles.USER,
        });
        // Blacklist old refresh token
        await (0, tokenBlacklist_1.blacklistToken)(token);
        const response = new ApiResponse_1.ApiResponse(200, {
            accessToken,
            refreshToken: newRefreshToken,
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
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Blacklist the access token
            await (0, tokenBlacklist_1.blacklistToken)(token);
        }
        // If refresh token is provided in body, blacklist it too
        const { refreshToken } = req.body;
        if (refreshToken) {
            await (0, tokenBlacklist_1.blacklistToken)(refreshToken);
        }
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
        // Blacklist all tokens for this user
        await (0, tokenBlacklist_1.blacklistUserTokens)(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.logout.allSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logoutAll = logoutAll;
//# sourceMappingURL=academyAuth.controller.js.map