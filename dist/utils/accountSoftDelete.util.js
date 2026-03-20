"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAcademyAppCanAuthenticate = exports.assertUserAppCanAuthenticate = exports.hasRole = void 0;
const ApiError_1 = require("./ApiError");
const i18n_1 = require("./i18n");
const hasRole = (user, roleName) => {
    const roles = user.roles;
    if (!roles || roles.length === 0)
        return false;
    return roles.some((r) => r?.name === roleName);
};
exports.hasRole = hasRole;
/**
 * User app (consumer) login blocked: admin delete, inactive, or per-role user soft-delete.
 */
const assertUserAppCanAuthenticate = (user) => {
    if (user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.accountDeleted'));
    }
    if (!user.isActive) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    if (user.userRoleDeletedAt) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.accountDeleted'));
    }
};
exports.assertUserAppCanAuthenticate = assertUserAppCanAuthenticate;
/**
 * Academy app login blocked: admin delete, inactive, or per-role academy soft-delete.
 */
const assertAcademyAppCanAuthenticate = (user) => {
    if (user.isDeleted) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.accountDeleted'));
    }
    if (!user.isActive) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.inactive'));
    }
    if (user.academyRoleDeletedAt) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.accountDeleted'));
    }
};
exports.assertAcademyAppCanAuthenticate = assertAcademyAppCanAuthenticate;
//# sourceMappingURL=accountSoftDelete.util.js.map