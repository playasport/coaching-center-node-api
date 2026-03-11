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
exports.updateAdminProfileImage = exports.logoutAll = exports.logout = exports.refreshToken = exports.changePassword = exports.updateAdminProfile = exports.getAdminProfile = exports.loginAdmin = void 0;
const adminUser_model_1 = require("../../models/adminUser.model");
const utils_1 = require("../../utils");
const jwt_1 = require("../../utils/jwt");
const ApiError_1 = require("../../utils/ApiError");
const ApiResponse_1 = require("../../utils/ApiResponse");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const authService = __importStar(require("../../services/client/auth.service"));
/**
 * Admin login
 */
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await adminUser_model_1.AdminUserModel.findOne({ email: email.toLowerCase(), isDeleted: false })
            .populate('roles', 'name')
            .lean();
        // Verify password first (before checking permissions to avoid revealing if email exists)
        // This prevents information disclosure about whether an email is registered
        let isPasswordValid = false;
        if (user) {
            isPasswordValid = await (0, utils_1.comparePassword)(password, user.password);
        }
        // If user doesn't exist or password is invalid, throw generic error
        // This ensures we don't reveal whether the email exists in the system
        if (!user || !isPasswordValid) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.login.invalidCredentials'));
        }
        // Check if user is active
        if (!user.isActive) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.account.inactive'));
        }
        // Check if user has admin role or admin panel permissions (only after password verification)
        const userRoles = user.roles;
        const adminRoles = [defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN, defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.EMPLOYEE, defaultRoles_enum_1.DefaultRoles.AGENT];
        const hasAdminRole = userRoles.some((r) => adminRoles.includes(r?.name));
        // If user doesn't have a default admin role, check if they have admin panel permissions
        if (!hasAdminRole) {
            const { PermissionModel } = await Promise.resolve().then(() => __importStar(require('../../models/permission.model')));
            const { Section } = await Promise.resolve().then(() => __importStar(require('../../enums/section.enum')));
            // Get role IDs (handle both _id from lean() and id from toJSON())
            const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
            const roleIds = userRoles
                .map((r) => {
                if (r?._id) {
                    return r._id instanceof Types.ObjectId ? r._id : new Types.ObjectId(r._id);
                }
                if (r?.id) {
                    return new Types.ObjectId(r.id);
                }
                return null;
            })
                .filter(Boolean);
            if (roleIds.length === 0) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.authorization.forbidden'));
            }
            // Check if user has any admin panel permissions (dashboard, permission, user, role, coaching_center, etc.)
            const adminSections = [
                Section.DASHBOARD,
                Section.PERMISSION,
                Section.USER,
                Section.ROLE,
                Section.COACHING_CENTER,
                Section.COACHING_CENTER_RATINGS,
            ];
            const hasAdminPermission = await PermissionModel.exists({
                role: { $in: roleIds },
                section: { $in: adminSections },
                isActive: true,
            });
            if (!hasAdminPermission) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.authorization.forbidden'));
            }
        }
        // Get role name (prefer super_admin > admin > employee > agent)
        let roleName = defaultRoles_enum_1.DefaultRoles.USER;
        if (userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN)) {
            roleName = defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN;
        }
        else if (userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.ADMIN)) {
            roleName = defaultRoles_enum_1.DefaultRoles.ADMIN;
        }
        else if (userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.EMPLOYEE)) {
            roleName = defaultRoles_enum_1.DefaultRoles.EMPLOYEE;
        }
        else if (userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.AGENT)) {
            roleName = defaultRoles_enum_1.DefaultRoles.AGENT;
        }
        // Clear user-level blacklist if it exists (user is logging in again after logout all)
        const { clearUserBlacklist } = await Promise.resolve().then(() => __importStar(require('../../utils/tokenBlacklist')));
        await clearUserBlacklist(user.id);
        // Generate tokens
        const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)({
            id: user.id,
            email: user.email,
            role: roleName,
        }, 'web');
        const response = new ApiResponse_1.ApiResponse(200, {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImage: user.profileImage || null,
                roles: userRoles.map((r) => r?.name),
            },
            accessToken,
            refreshToken,
        }, (0, i18n_1.t)('auth.login.success'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin login error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.loginAdmin = loginAdmin;
/**
 * Get admin profile
 */
const getAdminProfile = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id, isDeleted: false })
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { user }, (0, i18n_1.t)('admin.profile.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get admin profile error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAdminProfile = getAdminProfile;
/**
 * Update admin profile
 */
const updateAdminProfile = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const updateData = req.body;
        const user = await adminUser_model_1.AdminUserModel.findOneAndUpdate({ id: req.user.id, isDeleted: false }, {
            $set: {
                ...(updateData.firstName && { firstName: updateData.firstName }),
                ...(updateData.lastName !== undefined && { lastName: updateData.lastName || null }),
                ...(updateData.mobile && { mobile: updateData.mobile }),
            },
        }, { new: true, runValidators: true })
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { user }, (0, i18n_1.t)('admin.profile.updated'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update admin profile error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateAdminProfile = updateAdminProfile;
/**
 * Change admin password
 */
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { currentPassword, newPassword } = req.body;
        // Validate that new password is different from current password
        if (currentPassword === newPassword) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.password.sameAsCurrent'));
        }
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id, isDeleted: false }).select('password');
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        // Verify current password
        const isPasswordValid = await (0, utils_1.comparePassword)(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.password.currentPasswordIncorrect'));
        }
        // Update password
        const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../../utils/password')));
        const hashedPassword = await hashPassword(newPassword);
        await adminUser_model_1.AdminUserModel.updateOne({ id: req.user.id }, { $set: { password: hashedPassword } });
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.password.changed'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Change admin password error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.changePassword = changePassword;
/**
 * Refresh admin access token
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('auth.token.noToken'));
        }
        // Check if refresh token is blacklisted (including user-level blacklist from logout all)
        const { isTokenBlacklisted } = await Promise.resolve().then(() => __importStar(require('../../utils/tokenBlacklist')));
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
        }
        // Verify refresh token and get user ID
        const { verifyRefreshToken } = await Promise.resolve().then(() => __importStar(require('../../utils/jwt')));
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        }
        catch (error) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
        }
        // Check if user exists and has admin role
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: decoded.id, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
        }
        // Verify user has admin role or admin panel permissions
        const userRoles = user.roles;
        const adminRoles = [defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN, defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.EMPLOYEE, defaultRoles_enum_1.DefaultRoles.AGENT];
        const hasAdminRole = userRoles.some((r) => adminRoles.includes(r?.name));
        // If user doesn't have a default admin role, check if they have admin panel permissions
        if (!hasAdminRole) {
            const { PermissionModel } = await Promise.resolve().then(() => __importStar(require('../../models/permission.model')));
            const { Section } = await Promise.resolve().then(() => __importStar(require('../../enums/section.enum')));
            const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
            // Get role IDs (handle both _id from lean() and id from toJSON())
            const roleIds = userRoles
                .map((r) => {
                if (r?._id) {
                    return r._id instanceof Types.ObjectId ? r._id : new Types.ObjectId(r._id);
                }
                if (r?.id) {
                    return new Types.ObjectId(r.id);
                }
                return null;
            })
                .filter(Boolean);
            if (roleIds.length === 0) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.authorization.forbidden'));
            }
            // Check if user has any admin panel permissions (dashboard, permission, user, role, coaching_center, etc.)
            const adminSections = [
                Section.DASHBOARD,
                Section.PERMISSION,
                Section.USER,
                Section.ROLE,
                Section.COACHING_CENTER,
                Section.COACHING_CENTER_RATINGS,
            ];
            const hasAdminPermission = await PermissionModel.exists({
                role: { $in: roleIds },
                section: { $in: adminSections },
                isActive: true,
            });
            if (!hasAdminPermission) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.authorization.forbidden'));
            }
        }
        // Generate new token pair for admin user
        // Get user email (we already have roles from previous query)
        const userWithEmail = await adminUser_model_1.AdminUserModel.findOne({ id: decoded.id })
            .select('email')
            .lean();
        if (!userWithEmail) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.token.invalidToken'));
        }
        // Determine role name (use first admin role found from existing userRoles)
        const adminRole = userRoles.find((r) => adminRoles.includes(r?.name));
        const roleName = adminRole?.name || defaultRoles_enum_1.DefaultRoles.ADMIN;
        // Get device type from decoded token (default to web for admin)
        const deviceType = decoded.deviceType || 'web';
        // Generate new token pair
        const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.generateTokenPair)({
            id: userWithEmail.id || decoded.id,
            email: userWithEmail.email,
            role: roleName,
            deviceId: decoded.deviceId,
            deviceType,
        }, deviceType, decoded.deviceId);
        // Blacklist old refresh token
        const { blacklistToken } = await Promise.resolve().then(() => __importStar(require('../../utils/tokenBlacklist')));
        await blacklistToken(token);
        const response = new ApiResponse_1.ApiResponse(200, {
            accessToken,
            refreshToken: newRefreshToken,
        }, (0, i18n_1.t)('auth.token.refreshed'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin refresh token error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.refreshToken = refreshToken;
/**
 * Logout admin - blacklist current tokens
 */
const logout = async (req, res) => {
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
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin logout error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.logout = logout;
/**
 * Logout admin from all devices - blacklist all user tokens
 */
const logoutAll = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        await authService.logoutAll(req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('auth.logout.allSuccess'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin logout all error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.logoutAll = logoutAll;
/**
 * Update admin profile image
 */
const updateAdminProfileImage = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        if (!req.file) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.file.required'));
        }
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id, isDeleted: false }).lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        // Import S3 utilities
        const { uploadFileToS3, deleteFileFromS3 } = await Promise.resolve().then(() => __importStar(require('../../services/common/s3.service')));
        try {
            logger_1.logger.info('Starting admin profile image upload', {
                userId: user.id,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            });
            // Upload new image to S3 and delete old image in parallel
            const imageUrlPromise = uploadFileToS3({
                file: req.file,
                folder: 'users',
                userId: user.id,
            });
            // Delete old profile image in background (don't block upload)
            if (user.profileImage) {
                deleteFileFromS3(user.profileImage)
                    .then(() => {
                    logger_1.logger.info('Old admin profile image deleted', { oldImageUrl: user.profileImage });
                })
                    .catch((deleteError) => {
                    logger_1.logger.warn('Failed to delete old admin profile image, continuing with upload', deleteError);
                    // Don't fail the upload if deletion fails
                });
            }
            // Wait for upload to complete
            const imageUrl = await imageUrlPromise;
            // Update user profile image
            const updatedUser = await adminUser_model_1.AdminUserModel.findOneAndUpdate({ id: req.user.id }, { $set: { profileImage: imageUrl } }, { new: true, runValidators: true })
                .select('-password')
                .populate('roles', 'name description')
                .lean();
            if (!updatedUser) {
                throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
            }
            logger_1.logger.info('Admin profile image uploaded successfully', { imageUrl, userId: user.id });
            const response = new ApiResponse_1.ApiResponse(200, {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    profileImage: updatedUser.profileImage,
                    roles: updatedUser.roles.map((r) => r?.name),
                },
            }, (0, i18n_1.t)('admin.profile.imageUpdated'));
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Failed to upload admin profile image', {
                error: error?.message || error,
                stack: error?.stack,
                userId: user.id,
                fileName: req.file?.originalname,
            });
            throw new ApiError_1.ApiError(500, error?.message || (0, i18n_1.t)('auth.profile.imageUploadFailed'));
        }
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update admin profile image error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateAdminProfileImage = updateAdminProfileImage;
//# sourceMappingURL=adminAuth.controller.js.map