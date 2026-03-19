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
exports.exportAgentCoachingExcel = exports.deleteOperationalUser = exports.updateOperationalUser = exports.getOperationalUser = exports.getAllOperationalUsers = exports.createOperationalUser = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const adminUser_model_1 = require("../../models/adminUser.model");
const role_model_1 = require("../../models/role.model");
const password_1 = require("../../utils/password");
const passwordGenerator_1 = require("../../utils/passwordGenerator");
const agentCode_utils_1 = require("../../utils/agentCode.utils");
const email_service_1 = require("../../services/common/email.service");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const agentCoachingStatsService = __importStar(require("../../services/admin/agentCoachingStats.service"));
/**
 * Build address object for save. All address fields optional in API; save only when required fields for DB (line2, city, state, pincode) are present.
 */
const buildAddressForSave = (address) => {
    if (!address || typeof address !== 'object') {
        return null;
    }
    const line2 = address.line2 != null && String(address.line2).trim() !== '' ? String(address.line2).trim() : null;
    const city = address.city != null && String(address.city).trim() !== '' ? String(address.city).trim() : null;
    const state = address.state != null && String(address.state).trim() !== '' ? String(address.state).trim() : null;
    const pincode = address.pincode != null && String(address.pincode).trim() !== '' ? String(address.pincode).trim() : null;
    if (!line2 || !city || !state || !pincode) {
        return null;
    }
    return {
        line1: address.line1 != null && String(address.line1).trim() !== '' ? String(address.line1).trim() : null,
        line2,
        area: address.area != null && String(address.area).trim() !== '' ? String(address.area).trim() : null,
        city,
        state,
        country: address.country && String(address.country).trim() !== '' ? String(address.country).trim() : 'India',
        pincode,
    };
};
/**
 * Create operational user (any role except user/academy/super_admin)
 */
const createOperationalUser = async (req, res) => {
    const data = req.body;
    try {
        // Check if email and mobile already exist (parallel queries)
        const [existingUserByEmail, existingUserByMobile] = await Promise.all([
            adminUser_model_1.AdminUserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false }).lean(),
            data.mobile ? adminUser_model_1.AdminUserModel.findOne({ mobile: data.mobile, isDeleted: false }).lean() : Promise.resolve(null),
        ]);
        if (existingUserByEmail) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.emailExists'));
        }
        if (data.mobile && existingUserByMobile) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.mobileExists'));
        }
        // Validate and get roles (support both role names and ObjectIds)
        const roleNames = [];
        const roleIds = [];
        for (const input of data.roles) {
            if (mongoose_1.Types.ObjectId.isValid(input)) {
                roleIds.push(new mongoose_1.Types.ObjectId(input));
            }
            else {
                roleNames.push(input);
            }
        }
        // Build query for roles
        let rolesQuery;
        if (roleNames.length > 0 && roleIds.length > 0) {
            rolesQuery = {
                $or: [
                    { name: { $in: roleNames } },
                    { _id: { $in: roleIds } }
                ]
            };
        }
        else if (roleNames.length > 0) {
            rolesQuery = { name: { $in: roleNames } };
        }
        else if (roleIds.length > 0) {
            rolesQuery = { _id: { $in: roleIds } };
        }
        else {
            throw new ApiError_1.ApiError(400, 'Invalid roles format');
        }
        const roles = await role_model_1.RoleModel.find(rolesQuery);
        if (roles.length !== data.roles.length) {
            throw new ApiError_1.ApiError(400, 'One or more roles are invalid');
        }
        // Use password from request if provided; otherwise generate secure random password
        const userProvidedPassword = data.password;
        const isPasswordFromUser = typeof userProvidedPassword === 'string' && userProvidedPassword.trim().length > 0;
        const passwordToUse = isPasswordFromUser ? userProvidedPassword.trim() : (0, passwordGenerator_1.generateSecurePassword)(12);
        const hashedPassword = await (0, password_1.hashPassword)(passwordToUse);
        // Generate unique user ID
        const userId = (0, uuid_1.v4)();
        // Address: all fields optional; save if any field provided
        const address = buildAddressForSave(data.address);
        // Generate agentCode automatically when role is agent
        const isAgent = roles.some((r) => r.name === defaultRoles_enum_1.DefaultRoles.AGENT);
        const agentCode = isAgent ? await (0, agentCode_utils_1.generateUniqueAgentCode)() : undefined;
        // Create user (operational users don't have userType)
        const user = await adminUser_model_1.AdminUserModel.create({
            id: userId,
            email: data.email.toLowerCase(),
            firstName: data.firstName,
            middleName: data.middleName ?? null,
            lastName: data.lastName ?? null,
            mobile: data.mobile ?? null,
            password: hashedPassword,
            gender: data.gender ?? null,
            dob: data.dob ?? null,
            roles: roles.map((role) => role._id),
            isActive: data.isActive ?? true,
            address: address,
            isDeleted: false,
            ...(agentCode && { agentCode }),
        });
        // Populate roles before returning
        const populatedUser = await adminUser_model_1.AdminUserModel.findById(user._id)
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!populatedUser) {
            logger_1.logger.error('Operational user created but not found after creation', { userId, user_id: user._id });
            throw new ApiError_1.ApiError(500, 'Failed to create operational user');
        }
        logger_1.logger.info(`Admin created operational user: ${userId} (${data.email})`);
        // Send account credentials email only when we generated the password (not when user provided their own)
        const userName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
        if (!isPasswordFromUser) {
            (0, email_service_1.sendAccountCredentialsEmail)(data.email.toLowerCase(), passwordToUse, userName)
                .then(() => {
                logger_1.logger.info(`Account credentials email sent to operational user: ${data.email}`);
            })
                .catch((emailError) => {
                logger_1.logger.error('Failed to send account credentials email', {
                    email: data.email,
                    error: emailError instanceof Error ? emailError.message : emailError,
                });
                // Don't fail user creation if email fails, just log the error
            });
        }
        const response = new ApiResponse_1.ApiResponse(201, { user: populatedUser }, isPasswordFromUser ? 'Operational user created successfully.' : 'Operational user created successfully. Credentials have been sent to their email.');
        res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Create operational user error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            body: req.body,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.createOperationalUser = createOperationalUser;
/**
 * Get all operational users (excluding user/academy/super_admin)
 */
const getAllOperationalUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Extract filter parameters
        const search = req.query.search;
        const isActive = req.query.isActive;
        const role = req.query.role; // Optional role filter
        // Get all role IDs except user, academy, and super_admin
        const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
        const allRoles = await role_model_1.RoleModel.find({
            name: { $nin: disallowedRoleNames }
        }).lean();
        const allowedRoleIds = allRoles.map(role => new mongoose_1.Types.ObjectId(role._id));
        // Build query - only include users with allowed roles (excluding user, academy, super_admin)
        const query = {
            isDeleted: false,
            roles: { $in: allowedRoleIds }
        };
        // Search filter (by firstName, lastName, email, mobile)
        const searchConditions = [];
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            searchConditions.push({ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }, { mobile: searchRegex });
        }
        if (searchConditions.length > 0) {
            query.$or = searchConditions;
        }
        // isActive filter
        if (isActive !== undefined) {
            query.isActive = isActive === 'true' || isActive === '1';
        }
        // Optional role filter
        if (role) {
            const roleDoc = await role_model_1.RoleModel.findOne({ name: role }).lean();
            if (roleDoc && roleDoc._id) {
                const roleId = new mongoose_1.Types.ObjectId(roleDoc._id);
                // Ensure the role is one of the allowed roles (not user, academy, or super_admin)
                const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
                if (!disallowedRoleNames.includes(roleDoc.name) && allowedRoleIds.some(id => id.equals(roleId))) {
                    query.roles = roleId;
                }
                else {
                    // If role is not allowed, return empty result
                    query.roles = new mongoose_1.Types.ObjectId('000000000000000000000000');
                }
            }
            else {
                query.roles = new mongoose_1.Types.ObjectId('000000000000000000000000');
            }
        }
        // Execute query
        const usersQuery = adminUser_model_1.AdminUserModel.find(query)
            .select('-password')
            .populate({
            path: 'roles',
            select: 'name description',
            options: { strictPopulate: false }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const [users, total] = await Promise.all([
            usersQuery.lean(),
            adminUser_model_1.AdminUserModel.countDocuments(query),
        ]);
        // Format users
        const formattedUsers = users.map((user) => {
            const formatted = {
                ...user,
                id: user.id || (user._id ? user._id.toString() : null),
                roles: (user.roles || []).map((r) => ({
                    id: r?._id?.toString() || r?.id,
                    name: r?.name,
                    description: r?.description,
                })),
            };
            delete formatted._id;
            return formatted;
        });
        const response = new ApiResponse_1.ApiResponse(200, {
            users: formattedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        }, 'Operational users retrieved successfully');
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Get all operational users error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllOperationalUsers = getAllOperationalUsers;
/**
 * Get operational user by ID
 */
const getOperationalUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Get all role IDs except user, academy, and super_admin
        const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
        const allRoles = await role_model_1.RoleModel.find({
            name: { $nin: disallowedRoleNames }
        }).lean();
        const allowedRoleIds = allRoles.map(role => new mongoose_1.Types.ObjectId(role._id));
        // Build query
        let query;
        let userObjectId = null;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            userObjectId = new mongoose_1.Types.ObjectId(id);
            query = adminUser_model_1.AdminUserModel.findOne({
                $or: [
                    { _id: userObjectId, isDeleted: false, roles: { $in: allowedRoleIds } },
                    { id, isDeleted: false, roles: { $in: allowedRoleIds } }
                ]
            });
        }
        else {
            query = adminUser_model_1.AdminUserModel.findOne({ id, isDeleted: false, roles: { $in: allowedRoleIds } });
        }
        const user = await query
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, 'Operational user not found');
        }
        const formattedUser = {
            ...user,
            id: user.id || (user._id ? user._id.toString() : null),
        };
        delete formattedUser._id;
        const roles = (user.roles || []);
        const isAgent = roles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.AGENT);
        const payload = { user: formattedUser };
        if (isAgent && user._id) {
            try {
                const agentObjectId = user._id instanceof mongoose_1.Types.ObjectId ? user._id : new mongoose_1.Types.ObjectId(user._id);
                payload.agent_coaching_stats = await agentCoachingStatsService.getAgentCoachingStats(agentObjectId);
            }
            catch (e) {
                logger_1.logger.warn('Failed to fetch agent coaching stats', { userId: user.id, error: e });
            }
        }
        const response = new ApiResponse_1.ApiResponse(200, payload, 'Operational user retrieved successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get operational user error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getOperationalUser = getOperationalUser;
/**
 * Check if current user is super admin
 */
const isSuperAdmin = async (userId) => {
    try {
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: userId, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user || !user.roles) {
            return false;
        }
        const userRoles = user.roles;
        return userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
    }
    catch (error) {
        logger_1.logger.error('Error checking super admin status:', { userId, error });
        return false;
    }
};
/**
 * Update operational user
 * Super admin can update email and password
 */
const updateOperationalUser = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const currentUserIsSuperAdmin = await isSuperAdmin(req.user.id);
        // Get all role IDs except user, academy, and super_admin
        const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
        const allRoles = await role_model_1.RoleModel.find({
            name: { $nin: disallowedRoleNames }
        }).lean();
        const allowedRoleIds = allRoles.map(role => new mongoose_1.Types.ObjectId(role._id));
        // Build query
        let findQuery;
        let updateQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            findQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
                    { id, isDeleted: false, roles: { $in: allowedRoleIds } }
                ]
            };
            updateQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
                    { id, isDeleted: false, roles: { $in: allowedRoleIds } }
                ]
            };
        }
        else {
            findQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
            updateQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
        }
        const existingUser = await adminUser_model_1.AdminUserModel.findOne(findQuery);
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, 'Operational user not found');
        }
        const updateData = {};
        // Email and password can only be updated by super admin
        if (data.email !== undefined) {
            if (!currentUserIsSuperAdmin) {
                throw new ApiError_1.ApiError(403, 'Only super admin can update email');
            }
            const emailExists = await adminUser_model_1.AdminUserModel.findOne({
                email: data.email.toLowerCase(),
                _id: { $ne: existingUser._id },
                isDeleted: false,
            });
            if (emailExists) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.emailExists'));
            }
            updateData.email = data.email.toLowerCase();
        }
        // Password can only be updated by super_admin; when frontend sends password, hash and save
        if (data.password !== undefined && typeof data.password === 'string' && data.password.trim().length > 0) {
            if (!currentUserIsSuperAdmin) {
                throw new ApiError_1.ApiError(403, 'Only super admin can update password');
            }
            updateData.password = await (0, password_1.hashPassword)(data.password.trim());
        }
        if (data.firstName !== undefined) {
            updateData.firstName = data.firstName;
        }
        if (data.middleName !== undefined) {
            updateData.middleName = data.middleName ?? null;
        }
        if (data.lastName !== undefined) {
            updateData.lastName = data.lastName ?? null;
        }
        if (data.mobile !== undefined) {
            updateData.mobile = data.mobile ?? null;
        }
        if (data.gender !== undefined) {
            updateData.gender = data.gender ?? null;
        }
        if (data.dob !== undefined) {
            updateData.dob = data.dob ?? null;
        }
        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }
        if (data.address !== undefined) {
            if (data.address === null) {
                updateData.address = null;
            }
            else if (data.address && typeof data.address === 'object') {
                let mergedAddress;
                const addressData = data.address;
                if (existingUser.address) {
                    const existingAddress = existingUser.address;
                    const existingAddressObj = existingAddress.toObject ?
                        existingAddress.toObject() :
                        (typeof existingAddress === 'object' ? { ...existingAddress } : existingAddress);
                    mergedAddress = { ...existingAddressObj };
                    Object.keys(addressData).forEach((key) => {
                        if (addressData[key] !== null && addressData[key] !== undefined) {
                            mergedAddress[key] = addressData[key];
                        }
                    });
                }
                else {
                    mergedAddress = { ...addressData };
                }
                if (!mergedAddress.country) {
                    mergedAddress.country = 'India';
                }
                if (mergedAddress.line2 && mergedAddress.city &&
                    mergedAddress.state && mergedAddress.country &&
                    mergedAddress.pincode) {
                    if (mergedAddress.line1 === undefined) {
                        mergedAddress.line1 = null;
                    }
                    updateData.address = mergedAddress;
                }
                else {
                    updateData.address = null;
                }
            }
            else {
                updateData.address = null;
            }
        }
        // Handle roles update
        if (data.roles && data.roles.length > 0) {
            const roleNames = [];
            const roleIds = [];
            for (const input of data.roles) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            let rolesQuery;
            if (roleNames.length > 0 && roleIds.length > 0) {
                rolesQuery = {
                    $or: [
                        { name: { $in: roleNames } },
                        { _id: { $in: roleIds } }
                    ]
                };
            }
            else if (roleNames.length > 0) {
                rolesQuery = { name: { $in: roleNames } };
            }
            else if (roleIds.length > 0) {
                rolesQuery = { _id: { $in: roleIds } };
            }
            else {
                throw new ApiError_1.ApiError(400, 'Invalid roles format');
            }
            const roles = await role_model_1.RoleModel.find(rolesQuery);
            if (roles.length !== data.roles.length) {
                throw new ApiError_1.ApiError(400, 'One or more roles are invalid');
            }
            updateData.roles = roles.map((role) => role._id);
        }
        const user = await adminUser_model_1.AdminUserModel.findOneAndUpdate(updateQuery, { $set: updateData }, { new: true, runValidators: true })
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, 'Operational user not found');
        }
        logger_1.logger.info(`Admin updated operational user: ${id}`);
        const response = new ApiResponse_1.ApiResponse(200, { user }, 'Operational user updated successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update operational user error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateOperationalUser = updateOperationalUser;
/**
 * Delete operational user (soft delete)
 */
const deleteOperationalUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Get all role IDs except user, academy, and super_admin
        const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
        const allRoles = await role_model_1.RoleModel.find({
            name: { $nin: disallowedRoleNames }
        }).lean();
        const allowedRoleIds = allRoles.map(role => new mongoose_1.Types.ObjectId(role._id));
        let deleteQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            deleteQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
                    { id, isDeleted: false, roles: { $in: allowedRoleIds } }
                ]
            };
        }
        else {
            deleteQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
        }
        const user = await adminUser_model_1.AdminUserModel.findOneAndUpdate(deleteQuery, {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        }, { new: true });
        if (!user) {
            throw new ApiError_1.ApiError(404, 'Operational user not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, null, 'Operational user deleted successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Delete operational user error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.deleteOperationalUser = deleteOperationalUser;
const PERIODS = ['today', 'this_week', 'this_month', 'last_month', 'all_time', 'custom'];
/**
 * Export agent coaching centres to Excel.
 * GET /admin/operational-users/:id/agent-coaching-export?period=...&startDate=&endDate=
 * Only for users with agent role. period: today | this_week | this_month | last_month | all_time | custom.
 * For custom, startDate and endDate (YYYY-MM-DD) required.
 */
const exportAgentCoachingExcel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const period = req.query.period || 'all_time';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        if (!PERIODS.includes(period)) {
            throw new ApiError_1.ApiError(400, `Invalid period. Use one of: ${PERIODS.join(', ')}`);
        }
        if (period === 'custom' && (!startDate || !endDate)) {
            throw new ApiError_1.ApiError(400, 'For custom period, both startDate and endDate (YYYY-MM-DD) are required');
        }
        const disallowedRoleNames = [defaultRoles_enum_1.DefaultRoles.USER, defaultRoles_enum_1.DefaultRoles.ACADEMY, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN];
        const allRoles = await role_model_1.RoleModel.find({ name: { $nin: disallowedRoleNames } }).lean();
        const allowedRoleIds = allRoles.map((r) => new mongoose_1.Types.ObjectId(r._id));
        let findQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            findQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
                    { id, isDeleted: false, roles: { $in: allowedRoleIds } },
                ],
            };
        }
        else {
            findQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
        }
        const user = await adminUser_model_1.AdminUserModel.findOne(findQuery)
            .select('_id roles firstName lastName email mobile')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, 'Operational user not found');
        }
        const roles = (user.roles || []);
        const isAgent = roles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.AGENT);
        if (!isAgent) {
            throw new ApiError_1.ApiError(400, 'Agent coaching export is only available for users with agent role');
        }
        const agentObjectId = user._id instanceof mongoose_1.Types.ObjectId ? user._id : new mongoose_1.Types.ObjectId(user._id);
        const u = user;
        const agentName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || undefined;
        const buffer = await agentCoachingStatsService.exportAgentCoachingToExcel(agentObjectId, {
            period: period,
            startDate,
            endDate,
            agentName: agentName || undefined,
            agentEmail: u.email || undefined,
            agentMobile: u.mobile || undefined,
        });
        const filename = `agent-coaching-centres-${id}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            return next(error);
        }
        logger_1.logger.error('Export agent coaching Excel error:', error);
        next(new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError')));
    }
};
exports.exportAgentCoachingExcel = exportAgentCoachingExcel;
//# sourceMappingURL=operationalUser.controller.js.map