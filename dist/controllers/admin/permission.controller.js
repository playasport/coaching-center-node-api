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
exports.getMyPermissions = exports.getAvailableActions = exports.getAvailableSections = exports.bulkUpdatePermissions = exports.getPermissionsByRole = exports.deletePermission = exports.updatePermission = exports.createPermission = exports.getPermissionById = exports.getPermissions = void 0;
const permission_model_1 = require("../../models/permission.model");
const role_model_1 = require("../../models/role.model");
const ApiError_1 = require("../../utils/ApiError");
const ApiResponse_1 = require("../../utils/ApiResponse");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const mongoose_1 = require("mongoose");
const permission_service_1 = require("../../services/admin/permission.service");
const admin_service_1 = require("../../services/admin/admin.service");
/**
 * Get all permissions
 * Super Admin sees all, others see only their role's permissions
 */
const getPermissions = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Check if user is super admin
        const { AdminUserModel } = await Promise.resolve().then(() => __importStar(require('../../models/adminUser.model')));
        const user = await AdminUserModel.findOne({
            id: req.user.id,
        })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        const userRoles = user?.roles;
        const isSuperAdmin = userRoles?.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let query = {};
        if (!isSuperAdmin) {
            // Others see only permissions for their roles
            const roleIds = userRoles?.map((r) => r?._id instanceof mongoose_1.Types.ObjectId ? r._id : new mongoose_1.Types.ObjectId(r?._id)) || [];
            query = { role: { $in: roleIds } };
        }
        // Execute count and find queries in parallel
        const [total, permissions] = await Promise.all([
            permission_model_1.PermissionModel.countDocuments(query),
            permission_model_1.PermissionModel.find(query)
                .populate('role', 'name description')
                .sort({ role: 1, section: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = new ApiResponse_1.ApiResponse(200, {
            permissions,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        }, (0, i18n_1.t)('admin.permissions.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get permissions error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPermissions = getPermissions;
/**
 * Get permission by ID
 */
const getPermissionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid permission ID');
        }
        const permission = await permission_model_1.PermissionModel.findById(id)
            .populate('role', 'name description')
            .lean();
        if (!permission) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.permissions.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { permission }, (0, i18n_1.t)('admin.permissions.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get permission by ID error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPermissionById = getPermissionById;
/**
 * Create permission (Super Admin only)
 */
const createPermission = async (req, res) => {
    try {
        const data = req.body;
        // Check if role exists and if permission already exists (parallel queries)
        const [role, existing] = await Promise.all([
            role_model_1.RoleModel.findById(data.role),
            permission_model_1.PermissionModel.findOne({
                role: data.role,
                section: data.section,
            }),
        ]);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        if (existing) {
            throw new ApiError_1.ApiError(400, 'Permission already exists for this role and section');
        }
        // Create permission and invalidate cache in parallel
        const permission = new permission_model_1.PermissionModel(data);
        await permission.save();
        // Invalidate cache in background (don't block response)
        (0, permission_service_1.invalidatePermissionCache)(data.role).catch((error) => {
            logger_1.logger.warn('Failed to invalidate permission cache', { roleId: data.role, error });
        });
        const populated = await permission_model_1.PermissionModel.findById(permission._id)
            .populate('role', 'name description')
            .lean();
        const response = new ApiResponse_1.ApiResponse(201, { permission: populated }, (0, i18n_1.t)('admin.permissions.created'));
        res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Create permission error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.createPermission = createPermission;
/**
 * Update permission (Super Admin only)
 */
const updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid permission ID');
        }
        const permission = await permission_model_1.PermissionModel.findById(id);
        if (!permission) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.permissions.notFound'));
        }
        // Update permission and invalidate cache in parallel
        Object.assign(permission, data);
        await permission.save();
        // Invalidate cache in background (don't block response)
        (0, permission_service_1.invalidatePermissionCache)(permission.role).catch((error) => {
            logger_1.logger.warn('Failed to invalidate permission cache', { roleId: permission.role, error });
        });
        const populated = await permission_model_1.PermissionModel.findById(permission._id)
            .populate('role', 'name description')
            .lean();
        const response = new ApiResponse_1.ApiResponse(200, { permission: populated }, (0, i18n_1.t)('admin.permissions.updated'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update permission error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updatePermission = updatePermission;
/**
 * Delete permission (Super Admin only)
 */
const deletePermission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid permission ID');
        }
        const permission = await permission_model_1.PermissionModel.findById(id);
        if (!permission) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.permissions.notFound'));
        }
        const roleId = permission.role;
        // Delete permission and invalidate cache in parallel
        await permission_model_1.PermissionModel.findByIdAndDelete(id);
        // Invalidate cache in background (don't block response)
        (0, permission_service_1.invalidatePermissionCache)(roleId).catch((error) => {
            logger_1.logger.warn('Failed to invalidate permission cache', { roleId, error });
        });
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('admin.permissions.deleted'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Delete permission error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.deletePermission = deletePermission;
/**
 * Get permissions by role
 */
const getPermissionsByRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            throw new ApiError_1.ApiError(400, 'Invalid role ID');
        }
        // Check if role exists
        const role = await role_model_1.RoleModel.findById(roleId);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        const permissions = await (0, permission_service_1.getRolePermissions)(roleId);
        const response = new ApiResponse_1.ApiResponse(200, { role, permissions }, (0, i18n_1.t)('admin.permissions.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get permissions by role error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPermissionsByRole = getPermissionsByRole;
/**
 * Bulk update permissions for a role (Super Admin only)
 */
const bulkUpdatePermissions = async (req, res) => {
    try {
        const data = req.body;
        // Check if role exists
        const role = await role_model_1.RoleModel.findById(data.role);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        // Delete existing permissions
        await permission_model_1.PermissionModel.deleteMany({ role: data.role });
        // Create new permissions
        await permission_model_1.PermissionModel.insertMany(data.permissions.map((perm) => ({
            role: data.role,
            section: perm.section,
            actions: perm.actions,
            isActive: perm.isActive,
        })));
        // Fetch populated permissions
        const populated = await permission_model_1.PermissionModel.find({ role: data.role })
            .populate('role', 'name description')
            .lean();
        // Invalidate cache in background (don't block response)
        (0, permission_service_1.invalidatePermissionCache)(data.role).catch((error) => {
            logger_1.logger.warn('Failed to invalidate permission cache', { roleId: data.role, error });
        });
        const response = new ApiResponse_1.ApiResponse(200, { permissions: populated }, (0, i18n_1.t)('admin.permissions.bulkUpdated'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Bulk update permissions error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.bulkUpdatePermissions = bulkUpdatePermissions;
/**
 * Get available sections
 */
const getAvailableSections = async (_req, res) => {
    try {
        const sections = (0, admin_service_1.getAllSections)();
        const response = new ApiResponse_1.ApiResponse(200, { sections }, (0, i18n_1.t)('admin.sections.retrieved'));
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Get available sections error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAvailableSections = getAvailableSections;
/**
 * Get available actions
 */
const getAvailableActions = async (_req, res) => {
    try {
        const actions = (0, admin_service_1.getAllActions)();
        const response = new ApiResponse_1.ApiResponse(200, { actions }, (0, i18n_1.t)('admin.actions.retrieved'));
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Get available actions error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAvailableActions = getAvailableActions;
/**
 * Get current user's permissions (simplified format for frontend)
 */
const getMyPermissions = async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { getUserPermissions } = await Promise.resolve().then(() => __importStar(require('../../services/admin/permission.service')));
        const permissions = await getUserPermissions(req.user.id);
        // Transform to simplified format: { section: [actions] }
        const simplified = {};
        permissions.forEach((perm) => {
            if (perm.isActive) {
                simplified[perm.section] = perm.actions;
            }
        });
        const response = new ApiResponse_1.ApiResponse(200, { permissions: simplified }, (0, i18n_1.t)('admin.permissions.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get my permissions error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getMyPermissions = getMyPermissions;
//# sourceMappingURL=permission.controller.js.map