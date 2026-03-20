"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapUserDeletionFieldsForAdmin = mapUserDeletionFieldsForAdmin;
exports.enableClientUserAccount = enableClientUserAccount;
const mongoose_1 = require("mongoose");
const user_model_1 = require("../../models/user.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const batch_model_1 = require("../../models/batch.model");
const role_model_1 = require("../../models/role.model");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const logger_1 = require("../../utils/logger");
/**
 * Adds explicit flags for admin UI (list/detail) alongside raw timestamps.
 */
function mapUserDeletionFieldsForAdmin(user) {
    if (!user)
        return null;
    return {
        ...user,
        accountDeleted: !!user.isDeleted,
        userRoleSoftDeleted: user.userRoleDeletedAt != null,
        academyRoleSoftDeleted: user.academyRoleDeletedAt != null,
    };
}
/**
 * Clears global soft-delete, per-role soft-delete, reactivates account and owned centers/batches (mirrors academy soft-delete cascade).
 */
async function enableClientUserAccount(idParam) {
    const [userRole, academyRole] = await Promise.all([
        role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.USER }).lean(),
        role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.ACADEMY }).lean(),
    ]);
    const userRoleId = userRole?._id ? new mongoose_1.Types.ObjectId(userRole._id) : null;
    const academyRoleId = academyRole?._id ? new mongoose_1.Types.ObjectId(academyRole._id) : null;
    const roleIds = [];
    if (userRoleId)
        roleIds.push(userRoleId);
    if (academyRoleId)
        roleIds.push(academyRoleId);
    const findQuery = { roles: { $in: roleIds } };
    if (mongoose_1.Types.ObjectId.isValid(idParam) && idParam.length === 24) {
        findQuery.$or = [{ _id: new mongoose_1.Types.ObjectId(idParam) }, { id: idParam }];
    }
    else {
        findQuery.id = idParam;
    }
    const updated = await user_model_1.UserModel.findOneAndUpdate(findQuery, {
        $set: {
            isDeleted: false,
            deletedAt: null,
            userRoleDeletedAt: null,
            academyRoleDeletedAt: null,
            isActive: true,
        },
    }, { new: true, runValidators: true })
        .select('-password')
        .populate('roles', 'name description')
        .lean();
    if (!updated) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
    }
    const ownerId = updated._id;
    try {
        await coachingCenter_model_1.CoachingCenterModel.updateMany({ user: ownerId, is_deleted: false }, { $set: { is_active: true } });
        await batch_model_1.BatchModel.updateMany({ user: ownerId, is_deleted: false }, { $set: { is_active: true } });
    }
    catch (err) {
        logger_1.logger.error('enableClientUserAccount: failed to reactivate centers/batches', {
            userId: idParam,
            error: err instanceof Error ? err.message : err,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    const mapped = mapUserDeletionFieldsForAdmin(updated);
    return mapped ?? updated;
}
//# sourceMappingURL=clientUserAdmin.service.js.map