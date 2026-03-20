"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeleteAcademyAppAccount = exports.softDeleteUserAppAccount = void 0;
const user_model_1 = require("../../models/user.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const batch_model_1 = require("../../models/batch.model");
const userCache_1 = require("../../utils/userCache");
const deviceToken_service_1 = require("../common/deviceToken.service");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const accountSoftDelete_util_1 = require("../../utils/accountSoftDelete.util");
const logger_1 = require("../../utils/logger");
const softDeleteUserAppAccount = async (userId) => {
    const user = await user_model_1.UserModel.findOne({ id: userId })
        .populate('roles', 'name')
        .lean();
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
    }
    if (!(0, accountSoftDelete_util_1.hasRole)(user, defaultRoles_enum_1.DefaultRoles.USER)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (user.userRoleDeletedAt) {
        return { alreadyDeleted: true };
    }
    await user_model_1.UserModel.updateOne({ id: userId }, { $set: { userRoleDeletedAt: new Date() } });
    try {
        await deviceToken_service_1.deviceTokenService.revokeAllSessionsForAppContext(userId, 'user');
    }
    catch (err) {
        logger_1.logger.warn('revokeAllSessionsForAppContext user failed (non-blocking)', {
            userId,
            error: err instanceof Error ? err.message : err,
        });
    }
    return { alreadyDeleted: false };
};
exports.softDeleteUserAppAccount = softDeleteUserAppAccount;
const softDeleteAcademyAppAccount = async (userId) => {
    const user = await user_model_1.UserModel.findOne({ id: userId })
        .populate('roles', 'name')
        .lean();
    if (!user) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
    }
    if (!(0, accountSoftDelete_util_1.hasRole)(user, defaultRoles_enum_1.DefaultRoles.ACADEMY)) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('auth.login.invalidRole'));
    }
    if (user.academyRoleDeletedAt) {
        return { alreadyDeleted: true };
    }
    const ownerObjectId = await (0, userCache_1.getUserObjectId)(userId);
    if (!ownerObjectId) {
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    await user_model_1.UserModel.updateOne({ id: userId }, { $set: { academyRoleDeletedAt: new Date() } });
    try {
        await coachingCenter_model_1.CoachingCenterModel.updateMany({ user: ownerObjectId, is_deleted: false }, { $set: { is_active: false } });
    }
    catch (err) {
        logger_1.logger.error('Failed to deactivate coaching centers on academy soft-delete', {
            userId,
            error: err instanceof Error ? err.message : err,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    try {
        await batch_model_1.BatchModel.updateMany({ user: ownerObjectId, is_deleted: false }, { $set: { is_active: false } });
    }
    catch (err) {
        logger_1.logger.error('Failed to deactivate batches on academy soft-delete', {
            userId,
            error: err instanceof Error ? err.message : err,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
    try {
        await deviceToken_service_1.deviceTokenService.revokeAllSessionsForAppContext(userId, 'academy');
    }
    catch (err) {
        logger_1.logger.warn('revokeAllSessionsForAppContext academy failed (non-blocking)', {
            userId,
            error: err instanceof Error ? err.message : err,
        });
    }
    return { alreadyDeleted: false };
};
exports.softDeleteAcademyAppAccount = softDeleteAcademyAppAccount;
//# sourceMappingURL=accountSoftDelete.service.js.map