import { Types } from 'mongoose';
import { UserModel } from '../../models/user.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchModel } from '../../models/batch.model';
import { RoleModel } from '../../models/role.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { logger } from '../../utils/logger';

/**
 * Adds explicit flags for admin UI (list/detail) alongside raw timestamps.
 */
export function mapUserDeletionFieldsForAdmin<T extends Record<string, unknown>>(
  user: T | null
): (T & {
  accountDeleted: boolean;
  userRoleSoftDeleted: boolean;
  academyRoleSoftDeleted: boolean;
}) | null {
  if (!user) return null;
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
export async function enableClientUserAccount(idParam: string): Promise<Record<string, unknown>> {
  const [userRole, academyRole] = await Promise.all([
    RoleModel.findOne({ name: DefaultRoles.USER }).lean(),
    RoleModel.findOne({ name: DefaultRoles.ACADEMY }).lean(),
  ]);
  const userRoleId = userRole?._id ? new Types.ObjectId(userRole._id) : null;
  const academyRoleId = academyRole?._id ? new Types.ObjectId(academyRole._id) : null;
  const roleIds: Types.ObjectId[] = [];
  if (userRoleId) roleIds.push(userRoleId);
  if (academyRoleId) roleIds.push(academyRoleId);

  const findQuery: Record<string, unknown> = { roles: { $in: roleIds } };
  if (Types.ObjectId.isValid(idParam) && idParam.length === 24) {
    findQuery.$or = [{ _id: new Types.ObjectId(idParam) }, { id: idParam }];
  } else {
    findQuery.id = idParam;
  }

  const updated = await UserModel.findOneAndUpdate(
    findQuery,
    {
      $set: {
        isDeleted: false,
        deletedAt: null,
        userRoleDeletedAt: null,
        academyRoleDeletedAt: null,
        isActive: true,
      },
    },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('roles', 'name description')
    .lean();

  if (!updated) {
    throw new ApiError(404, t('auth.user.notFound'));
  }

  const ownerId = (updated as any)._id as Types.ObjectId;
  try {
    await CoachingCenterModel.updateMany(
      { user: ownerId, is_deleted: false },
      { $set: { is_active: true } }
    );
    await BatchModel.updateMany(
      { user: ownerId, is_deleted: false },
      { $set: { is_active: true } }
    );
  } catch (err) {
    logger.error('enableClientUserAccount: failed to reactivate centers/batches', {
      userId: idParam,
      error: err instanceof Error ? err.message : err,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }

  const mapped = mapUserDeletionFieldsForAdmin(updated as Record<string, unknown>);
  return mapped ?? (updated as Record<string, unknown>);
}
