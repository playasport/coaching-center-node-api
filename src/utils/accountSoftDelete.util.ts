import { User } from '../models/user.model';
import { ApiError } from './ApiError';
import { t } from './i18n';

export const hasRole = (user: Pick<User, 'roles'> | { roles?: unknown[] }, roleName: string): boolean => {
  const roles = user.roles as { name?: string }[] | undefined;
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => r?.name === roleName);
};

/**
 * User app (consumer) login blocked: admin delete, inactive, or per-role user soft-delete.
 */
export const assertUserAppCanAuthenticate = (user: User): void => {
  if (user.isDeleted) {
    throw new ApiError(403, t('auth.login.accountDeleted'));
  }
  if (!user.isActive) {
    throw new ApiError(403, t('auth.login.inactive'));
  }
  if (user.userRoleDeletedAt) {
    throw new ApiError(403, t('auth.login.accountDeleted'));
  }
};

/**
 * Academy app login blocked: admin delete, inactive, or per-role academy soft-delete.
 */
export const assertAcademyAppCanAuthenticate = (user: User): void => {
  if (user.isDeleted) {
    throw new ApiError(403, t('auth.login.accountDeleted'));
  }
  if (!user.isActive) {
    throw new ApiError(403, t('auth.login.inactive'));
  }
  if (user.academyRoleDeletedAt) {
    throw new ApiError(403, t('auth.login.accountDeleted'));
  }
};
