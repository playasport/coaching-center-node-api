import { UserModel } from '../../models/user.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchModel } from '../../models/batch.model';
import { getUserObjectId } from '../../utils/userCache';
import { deviceTokenService } from '../common/deviceToken.service';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { hasRole } from '../../utils/accountSoftDelete.util';
import { logger } from '../../utils/logger';

export const softDeleteUserAppAccount = async (
  userId: string
): Promise<{ alreadyDeleted: boolean }> => {
  const user = await UserModel.findOne({ id: userId })
    .populate('roles', 'name')
    .lean();

  if (!user) {
    throw new ApiError(404, t('auth.user.notFound'));
  }

  if (!hasRole(user, DefaultRoles.USER)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (user.userRoleDeletedAt) {
    return { alreadyDeleted: true };
  }

  await UserModel.updateOne({ id: userId }, { $set: { userRoleDeletedAt: new Date() } });

  try {
    await deviceTokenService.revokeAllSessionsForAppContext(userId, 'user');
  } catch (err) {
    logger.warn('revokeAllSessionsForAppContext user failed (non-blocking)', {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }

  return { alreadyDeleted: false };
};

export const softDeleteAcademyAppAccount = async (
  userId: string
): Promise<{ alreadyDeleted: boolean }> => {
  const user = await UserModel.findOne({ id: userId })
    .populate('roles', 'name')
    .lean();

  if (!user) {
    throw new ApiError(404, t('auth.user.notFound'));
  }

  if (!hasRole(user, DefaultRoles.ACADEMY)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (user.academyRoleDeletedAt) {
    return { alreadyDeleted: true };
  }

  const ownerObjectId = await getUserObjectId(userId);
  if (!ownerObjectId) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  await UserModel.updateOne({ id: userId }, { $set: { academyRoleDeletedAt: new Date() } });

  try {
    await CoachingCenterModel.updateMany(
      { user: ownerObjectId, is_deleted: false },
      { $set: { is_active: false } }
    );
  } catch (err) {
    logger.error('Failed to deactivate coaching centers on academy soft-delete', {
      userId,
      error: err instanceof Error ? err.message : err,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }

  try {
    await BatchModel.updateMany(
      { user: ownerObjectId, is_deleted: false },
      { $set: { is_active: false } }
    );
  } catch (err) {
    logger.error('Failed to deactivate batches on academy soft-delete', {
      userId,
      error: err instanceof Error ? err.message : err,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }

  try {
    await deviceTokenService.revokeAllSessionsForAppContext(userId, 'academy');
  } catch (err) {
    logger.warn('revokeAllSessionsForAppContext academy failed (non-blocking)', {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }

  return { alreadyDeleted: false };
};
