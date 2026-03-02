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
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
const role_model_1 = require("../../models/role.model");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const adminUser_model_1 = require("../../models/adminUser.model");
const mongoose_1 = require("mongoose");
const roleService = __importStar(require("../../services/admin/role.service"));
/**
 * Get all roles (admin - Super Admin only)
 */
const getAllRoles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await roleService.getAllRoles(page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Roles retrieved successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get all roles error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllRoles = getAllRoles;
/**
 * Get role by ID (admin - Super Admin only)
 */
const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid role ID');
        }
        const role = await role_model_1.RoleModel.findById(id).lean();
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { role }, 'Role retrieved successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get role by ID error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getRoleById = getRoleById;
/**
 * Create role (admin - Super Admin only)
 */
const createRole = async (req, res) => {
    try {
        const data = req.body;
        // Check if role name already exists
        const existingRole = await role_model_1.RoleModel.findOne({ name: data.name });
        if (existingRole) {
            throw new ApiError_1.ApiError(400, 'Role name already exists');
        }
        // Prevent creating default roles
        const defaultRoleNames = Object.values(defaultRoles_enum_1.DefaultRoles);
        if (defaultRoleNames.includes(data.name)) {
            throw new ApiError_1.ApiError(400, 'Cannot create default system roles');
        }
        // Create role
        const role = await role_model_1.RoleModel.create({
            name: data.name,
            description: data.description ?? null,
            visibleToRoles: data.visibleToRoles ?? null,
        });
        logger_1.logger.info(`Admin created role: ${role.name} (${role._id})`);
        const response = new ApiResponse_1.ApiResponse(201, { role }, 'Role created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Create role error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.createRole = createRole;
/**
 * Update role (admin - Super Admin only)
 */
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid role ID');
        }
        const role = await role_model_1.RoleModel.findById(id);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        // Prevent modifying default roles (except description and visibleToRoles)
        const defaultRoleNames = Object.values(defaultRoles_enum_1.DefaultRoles);
        if (defaultRoleNames.includes(role.name)) {
            // Only allow updating description and visibleToRoles for default roles
            if (data.description !== undefined) {
                role.description = data.description ?? null;
            }
            if (data.visibleToRoles !== undefined) {
                role.visibleToRoles = data.visibleToRoles ?? null;
            }
        }
        else {
            // For non-default roles, allow all updates
            if (data.description !== undefined) {
                role.description = data.description ?? null;
            }
            if (data.visibleToRoles !== undefined) {
                role.visibleToRoles = data.visibleToRoles ?? null;
            }
        }
        await role.save();
        logger_1.logger.info(`Admin updated role: ${role.name} (${role._id})`);
        const response = new ApiResponse_1.ApiResponse(200, { role }, 'Role updated successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update role error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateRole = updateRole;
/**
 * Delete role (admin - Super Admin only)
 */
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, 'Invalid role ID');
        }
        const role = await role_model_1.RoleModel.findById(id);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        // Prevent deleting default roles
        const defaultRoleNames = Object.values(defaultRoles_enum_1.DefaultRoles);
        if (defaultRoleNames.includes(role.name)) {
            throw new ApiError_1.ApiError(400, 'Cannot delete default system roles');
        }
        // Check if any admin users have this role
        const usersWithRole = await adminUser_model_1.AdminUserModel.countDocuments({
            roles: new mongoose_1.Types.ObjectId(id),
            isDeleted: false,
        });
        if (usersWithRole > 0) {
            throw new ApiError_1.ApiError(400, `Cannot delete role. ${usersWithRole} user(s) are assigned to this role`);
        }
        // Delete role
        await role_model_1.RoleModel.findByIdAndDelete(id);
        logger_1.logger.info(`Admin deleted role: ${role.name} (${id})`);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Role deleted successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Delete role error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.deleteRole = deleteRole;
//# sourceMappingURL=role.controller.js.map