"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRoles = exports.getRolesByUser = void 0;
const role_model_1 = require("../models/role.model");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
/**
 * Get all roles visible to the logged-in user based on their role
 * @param userRole - The role ID of the logged-in user
 * @returns Array of roles that the user can view
 */
const getRolesByUser = async (userRole) => {
    try {
        let roles;
        // SUPER_ADMIN can see all roles
        if (userRole === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN) {
            roles = await role_model_1.RoleModel.find({}).select('_id name description').sort({ name: 1 }).lean();
        }
        // ADMIN can see all roles
        else if (userRole === defaultRoles_enum_1.DefaultRoles.ADMIN) {
            roles = await role_model_1.RoleModel.find({}).select('_id name description').sort({ name: 1 }).lean();
        }
        // For other roles, filter based on visibleToRoles
        else {
            const allRoles = await role_model_1.RoleModel.find({}).sort({ name: 1 }).lean();
            const visibleRoles = allRoles.filter((role) => {
                // If visibleToRoles is null or empty, only SUPER_ADMIN and ADMIN can see it
                if (!role.visibleToRoles || role.visibleToRoles.length === 0) {
                    return false; // Regular users can't see roles with null visibleToRoles
                }
                // Check if user's role is in the visibleToRoles array
                return role.visibleToRoles.includes(userRole);
            });
            // Select only name and description fields
            roles = visibleRoles.map((role) => ({
                id: role._id?.toString(),
                name: role.name,
                description: role.description,
            }));
        }
        // Transform to include id field and exclude unwanted fields
        return roles.map((role) => ({
            id: role._id?.toString() || role.id,
            name: role.name,
            description: role.description,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch roles:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('role.list.failed') || 'Failed to fetch roles');
    }
};
exports.getRolesByUser = getRolesByUser;
/**
 * Get all roles (admin only - for internal use)
 */
const getAllRoles = async () => {
    try {
        const roles = await role_model_1.RoleModel.find({}).sort({ name: 1 });
        return roles;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch all roles:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('role.list.failed') || 'Failed to fetch roles');
    }
};
exports.getAllRoles = getAllRoles;
//# sourceMappingURL=role.service.js.map