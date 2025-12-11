import { v4 as uuidv4 } from 'uuid';
import { t } from '../utils/i18n';
import { userService, UpdateUserData } from './user.service';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { OtpChannel } from '../enums/otpChannel.enum';
import { OtpMode } from '../enums/otpMode.enum';
import { config } from '../config/env';
import { comparePassword } from '../utils';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { blacklistToken, blacklistUserTokens } from '../utils/tokenBlacklist';
import { sendOtpSms } from './sms.service';
import { sendPasswordResetEmail } from './email.service';
import { otpService } from './otp.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import type {
  AcademyRegisterInput,
  AcademyLoginInput,
  AcademySocialLoginInput,
  AcademyProfileUpdateInput,
  AcademyAddressUpdateInput,
  AcademyPasswordChangeInput,
  AcademyForgotPasswordRequestInput,
  AcademyForgotPasswordVerifyInput,
  UserRegisterInput,
  UserLoginInput,
  UserSocialLoginInput,
  UserProfileUpdateInput,
  UserAddressUpdateInput,
  UserPasswordChangeInput,
  UserForgotPasswordRequestInput,
  UserForgotPasswordVerifyInput,
} from '../validations/auth.validation';
import { firebaseAuthService } from './firebaseAuth.service';
import { uploadFileToS3, deleteFileFromS3 } from './s3.service';
import { User } from '../models/user.model';

// Helper function to get role name from roles array
const getRoleName = (user: User): string => {
  const roles = user.roles as any[];
  return roles && roles.length > 0 ? roles[0]?.name : DefaultRoles.USER;
};

// Helper function to check if user has a specific role
const hasRole = (user: User, roleName: string): boolean => {
  const roles = user.roles as any[];
  if (!roles || roles.length === 0) return false;
  return roles.some((r: any) => r?.name === roleName);
};

export interface RegisterResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SocialLoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  provider?: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface OtpSendResult {
  mobile: string;
  mode: string;
}

export interface OtpVerifyResult {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Register a new academy user
 */
export const registerAcademyUser = async (data: AcademyRegisterInput): Promise<RegisterResult> => {
  const { firstName, lastName, email, password, mobile, otp } = data;

  if (!otp) {
    throw new ApiError(400, t('validation.otp.required'));
  }

  const otpStatus = await otpService.verifyOtp(
    { channel: OtpChannel.MOBILE, identifier: mobile },
    otp,
    OtpMode.REGISTER
  );

  if (otpStatus !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found: t('auth.login.invalidOtp'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[otpStatus] ?? t('auth.login.invalidOtp'));
  }

  const existingUser = await userService.findByEmail(email);
  if (existingUser) {
    throw new ApiError(400, t('auth.register.emailExists'));
  }

  const user = await userService.create({
    id: uuidv4(),
    email,
    password,
    firstName,
    lastName,
    mobile,
    role: DefaultRoles.ACADEMY,
    isActive: true,
  });

  // Get role name from populated roles array
  const roleName = getRoleName(user);

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: roleName,
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Login academy user with email and password
 */
export const loginAcademyUser = async (data: AcademyLoginInput): Promise<LoginResult> => {
  const { email, password } = data;

  let user = await userService.findByEmailWithPassword(email);

  if (!user || !user.password) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  // If user has 'user' role and trying to login as academy, add academy role (keep user role)
  if (hasRole(user, DefaultRoles.USER) && !hasRole(user, DefaultRoles.ACADEMY)) {
    const updatedUser = await userService.update(user.id, {
      role: DefaultRoles.ACADEMY,
      addRole: true,
    });
    if (updatedUser) {
      user = await userService.findByEmailWithPassword(email);
      if (!user) {
        throw new ApiError(500, t('errors.internalServerError'));
      }
    }
  }

  // Check if user has academy role (could be in roles array even if not first)
  if (!hasRole(user, DefaultRoles.ACADEMY)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, t('auth.login.inactive'));
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: DefaultRoles.ACADEMY,
  });

  const sanitizedUser = userService.sanitize(user);
  if (!sanitizedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return {
    user: sanitizedUser,
    accessToken,
    refreshToken,
  };
};

/**
 * Social login for academy user
 */
export const socialLoginAcademyUser = async (data: AcademySocialLoginInput): Promise<SocialLoginResult> => {
  const payload = data;

  const decodedToken = await firebaseAuthService.verifyIdToken(payload.idToken);

  const email = decodedToken.email?.toLowerCase();
  if (!email) {
    throw new ApiError(400, t('auth.social.missingEmail'));
  }

  let user = await userService.findByEmail(email);

  if (!user) {
    const nameFromToken = decodedToken.name ?? '';
    const [tokenFirstName, ...tokenLastParts] = nameFromToken.trim().split(/\s+/).filter(Boolean);
    const firstName =
      payload.firstName?.trim() ||
      tokenFirstName ||
      'User';
    const lastName =
      payload.lastName?.trim() ||
      (tokenLastParts.length ? tokenLastParts.join(' ') : decodedToken.family_name || null) ||
      null;

    user = await userService.create({
      id: uuidv4(),
      email,
      firstName,
      lastName,
      password: `${uuidv4()}!Social1`,
      role: DefaultRoles.ACADEMY,
      isActive: true,
    });
  }

  // If user has 'user' role and trying to login as academy, add academy role (keep user role)
  if (hasRole(user, DefaultRoles.USER) && !hasRole(user, DefaultRoles.ACADEMY)) {
    const updatedUser = await userService.update(user.id, {
      role: DefaultRoles.ACADEMY,
      addRole: true,
    });
    if (updatedUser) {
      user = await userService.findByEmail(email);
      if (!user) {
        throw new ApiError(500, t('errors.internalServerError'));
      }
    }
  }

  // Check if user has academy role (could be in roles array even if not first)
  if (!hasRole(user, DefaultRoles.ACADEMY)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, t('auth.login.inactive'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: DefaultRoles.ACADEMY,
  });

  return {
    user,
    accessToken,
    refreshToken,
    provider: payload.provider ?? decodedToken.firebase?.sign_in_provider,
  };
};

/**
 * Update academy user profile
 */
export const updateAcademyProfile = async (
  userId: string,
  data: AcademyProfileUpdateInput,
  file?: Express.Multer.File
): Promise<User> => {
  const existingUser = await userService.findById(userId);
  if (!existingUser) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const updates: UpdateUserData = {};

  if (data.firstName) {
    updates.firstName = data.firstName;
  }

  if (data.lastName !== undefined) {
    updates.lastName = data.lastName ?? null;
  }

  // Handle profile image upload
  if (file) {
    try {
      logger.info('Starting profile image upload', {
        userId: existingUser.id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      // Delete old profile image if exists
      if (existingUser.profileImage) {
        try {
          await deleteFileFromS3(existingUser.profileImage);
          logger.info('Old profile image deleted', { oldImageUrl: existingUser.profileImage });
        } catch (deleteError) {
          logger.warn('Failed to delete old profile image, continuing with upload', deleteError);
          // Don't fail the upload if deletion fails
        }
      }

      // Upload new image to S3
      const imageUrl = await uploadFileToS3({
        file,
        folder: 'users',
        userId: existingUser.id,
      });

      updates.profileImage = imageUrl;
      logger.info('Profile image uploaded successfully', { imageUrl, userId: existingUser.id });
    } catch (error: any) {
      logger.error('Failed to upload profile image', {
        error: error?.message || error,
        stack: error?.stack,
        userId: existingUser.id,
        fileName: file?.originalname,
      });
      throw new ApiError(500, error?.message || t('auth.profile.imageUploadFailed'));
    }
  }

  if (!Object.keys(updates).length && !file) {
    throw new ApiError(400, t('validation.profile.noChanges'));
  }

  const updatedUser = await userService.update(existingUser.id, updates);
  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return updatedUser;
};

/**
 * Update academy user address
 */
export const updateAcademyAddress = async (
  userId: string,
  data: AcademyAddressUpdateInput
): Promise<User> => {
  const existingUser = await userService.findById(userId);
  if (!existingUser) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const updatedUser = await userService.update(existingUser.id, {
    address: {
      ...data.address,
      isDeleted: false,
    },
  });

  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return updatedUser;
};

/**
 * Change academy user password
 */
export const changeAcademyPassword = async (
  userId: string,
  data: AcademyPasswordChangeInput
): Promise<void> => {
  const { currentPassword, newPassword } = data;

  const user = await userService.findByIdWithPassword(userId);
  if (!user || !user.password) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const isCurrentValid = await comparePassword(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new ApiError(400, t('auth.profile.invalidCurrentPassword'));
  }

  await userService.update(user.id, { password: newPassword });
};

/**
 * Request password reset OTP
 */
export const requestAcademyPasswordReset = async (
  data: AcademyForgotPasswordRequestInput
): Promise<{ mode: string }> => {
  const otp = config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();

  if (data.mode === 'mobile') {
    const user = await userService.findByMobile(data.mobile);

    if (!user) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }

    // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
    if (hasRole(user, DefaultRoles.USER) && !hasRole(user, DefaultRoles.ACADEMY)) {
      await userService.update(user.id, {
        role: DefaultRoles.ACADEMY,
        addRole: true,
      });
    }
    
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.ACADEMY)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    await otpService.createOtp(
      { channel: OtpChannel.MOBILE, identifier: data.mobile },
      otp,
      OtpMode.FORGOT_PASSWORD
    );

    const mobileNumber = `+91${data.mobile}`;
    await sendOtpSms(mobileNumber, otp);
  } else {
    const emailLower = data.email.toLowerCase();
    const user = await userService.findByEmail(emailLower);

    if (!user) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }

    // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
    if (hasRole(user, DefaultRoles.USER) && !hasRole(user, DefaultRoles.ACADEMY)) {
      await userService.update(user.id, {
        role: DefaultRoles.ACADEMY,
        addRole: true,
      });
    }
    
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.ACADEMY)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    await otpService.createOtp(
      { channel: OtpChannel.EMAIL, identifier: emailLower },
      otp,
      OtpMode.FORGOT_PASSWORD
    );

    await sendPasswordResetEmail(emailLower, otp, {
      name: user.firstName || 'User',
    });
  }

  return { mode: data.mode };
};

/**
 * Verify password reset OTP and reset password
 */
export const verifyAcademyPasswordReset = async (
  data: AcademyForgotPasswordVerifyInput
): Promise<PasswordResetResult> => {
  const identifier =
    data.mode === 'mobile' ? data.mobile : data.email.toLowerCase();
  const channel = data.mode === 'mobile' ? OtpChannel.MOBILE : OtpChannel.EMAIL;

  const status = await otpService.verifyOtp(
    { channel, identifier },
    data.otp,
    OtpMode.FORGOT_PASSWORD
  );

  if (status !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found: t('auth.password.resetOtpInvalid'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[status] ?? t('auth.login.invalidOtp'));
  }

  const user =
    data.mode === 'mobile'
      ? await userService.findByMobile(data.mobile)
      : await userService.findByEmail(identifier);

  if (!user) {
    throw new ApiError(404, t('auth.password.resetUserNotFound'));
  }

  const roleName = getRoleName(user);
  if (roleName !== DefaultRoles.ACADEMY) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  const updatedUser = await userService.update(user.id, {
    password: data.newPassword,
  });

  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: updatedUser.id,
    email: updatedUser.email,
    role: getRoleName(updatedUser),
  });

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
};

/**
 * Get current academy user
 */
export const getCurrentAcademyUser = async (userId: string): Promise<User> => {
  const user = await userService.findById(userId);

  if (!user) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  return user;
};

/**
 * Send OTP to mobile number
 */
export const sendAcademyOtp = async (data: {
  mobile: string;
  mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
}): Promise<OtpSendResult> => {
  const { mobile, mode = 'login' } = data;

  const existingUser = await userService.findByMobile(mobile);

  const otpModeMap: Record<string, OtpMode> = {
    login: OtpMode.LOGIN,
    register: OtpMode.REGISTER,
    profile_update: OtpMode.PROFILE_UPDATE,
    forgot_password: OtpMode.FORGOT_PASSWORD,
  };
  const otpMode = otpModeMap[mode] || OtpMode.LOGIN;

  if (mode === 'login') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    // If user has 'user' role and trying to login as academy, add academy role (keep user role)
    if (hasRole(existingUser, DefaultRoles.USER) && !hasRole(existingUser, DefaultRoles.ACADEMY)) {
      await userService.update(existingUser.id, {
        role: DefaultRoles.ACADEMY,
        addRole: true,
      });
    }
    
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(existingUser, DefaultRoles.ACADEMY)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  } else if (mode === 'register') {
    if (existingUser) {
      // If user exists as user, add academy role (keep user role) instead of throwing error
      if (hasRole(existingUser, DefaultRoles.USER)) {
        await userService.update(existingUser.id, {
          role: DefaultRoles.ACADEMY,
          addRole: true,
        });
      } else {
        throw new ApiError(400, t('auth.register.mobileExists'));
      }
    }
  } else if (mode === 'forgot_password') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }
    
    // If user has 'user' role and trying to reset password as academy, add academy role (keep user role)
    if (hasRole(existingUser, DefaultRoles.USER) && !hasRole(existingUser, DefaultRoles.ACADEMY)) {
      await userService.update(existingUser.id, {
        role: DefaultRoles.ACADEMY,
        addRole: true,
      });
    }
    
    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(existingUser, DefaultRoles.ACADEMY)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  }

  const otp = config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
  await otpService.createOtp({ channel: OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
  // add +91 to the mobile number
  const mobileNumber = `+91${mobile}`;
  await sendOtpSms(mobileNumber, otp);

  return {
    mobile: mobileNumber,
    mode,
  };
};

/**
 * Verify OTP
 */
export const verifyAcademyOtp = async (data: {
  mobile: string;
  otp: string;
  mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
}): Promise<OtpVerifyResult> => {
  const { mobile, otp, mode = 'login' } = data;

  const otpModeMap: Record<string, OtpMode> = {
    login: OtpMode.LOGIN,
    register: OtpMode.REGISTER,
    profile_update: OtpMode.PROFILE_UPDATE,
    forgot_password: OtpMode.FORGOT_PASSWORD,
  };
  const otpMode = otpModeMap[mode] || OtpMode.LOGIN;

  const status = await otpService.verifyOtp({ channel: OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);

  if (status !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found:
        mode === 'register'
          ? t('auth.register.otpResend')
          : mode === 'profile_update'
          ? t('auth.profile.mobileVerificationFailed')
          : mode === 'forgot_password'
          ? t('auth.password.resetOtpInvalid')
          : t('auth.login.mobileNotFound'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[status] ?? t('auth.login.invalidOtp'));
  }

  if (mode === 'login') {
    let user = await userService.findByMobile(mobile);

    if (!user) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    // If user has 'user' role and trying to login as academy, add academy role (keep user role)
    if (hasRole(user, DefaultRoles.USER) && !hasRole(user, DefaultRoles.ACADEMY)) {
      const updatedUser = await userService.update(user.id, {
        role: DefaultRoles.ACADEMY,
        addRole: true,
      });
      if (updatedUser) {
        user = await userService.findByMobile(mobile);
        if (!user) {
          throw new ApiError(500, t('errors.internalServerError'));
        }
      }
    }

    // Check if user has academy role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.ACADEMY)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError(403, t('auth.login.inactive'));
    }

    const { accessToken, refreshToken } = generateTokenPair({
      id: user.id,
      email: user.email,
      role: DefaultRoles.ACADEMY,
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  return {};
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (token: string): Promise<RefreshTokenResult> => {
  if (!token) {
    throw new ApiError(400, t('auth.token.noToken'));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (error) {
    throw new ApiError(401, t('auth.token.invalidToken'));
  }

  // Check if user still exists and is active
  const user = await userService.findById(decoded.id);
  if (!user || !user.isActive || user.isDeleted) {
    throw new ApiError(401, t('auth.token.invalidToken'));
  }

  // Generate new token pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: getRoleName(user),
  });

  // Blacklist old refresh token
  await blacklistToken(token);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Logout user - blacklist current tokens
 */
export const logout = async (_userId: string, accessToken?: string, refreshToken?: string): Promise<void> => {
  if (accessToken) {
    // Blacklist the access token
    await blacklistToken(accessToken);
  }

  // If refresh token is provided, blacklist it too
  if (refreshToken) {
    await blacklistToken(refreshToken);
  }
};

/**
 * Logout from all devices - blacklist all user tokens
 */
export const logoutAll = async (userId: string): Promise<void> => {
  // Blacklist all tokens for this user
  await blacklistUserTokens(userId);
};

// ==================== USER AUTH FUNCTIONS ====================

/**
 * Register a new user (student or guardian)
 */
export const registerUser = async (data: UserRegisterInput): Promise<RegisterResult> => {
  const { firstName, lastName, email, password, mobile, dob, gender, otp, type } = data;

  if (!otp) {
    throw new ApiError(400, t('validation.otp.required'));
  }

  const otpStatus = await otpService.verifyOtp(
    { channel: OtpChannel.MOBILE, identifier: mobile },
    otp,
    OtpMode.REGISTER
  );

  if (otpStatus !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found: t('auth.login.invalidOtp'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[otpStatus] ?? t('auth.login.invalidOtp'));
  }

  const existingUser = await userService.findByEmail(email);
  let user: User;
  
  if (existingUser) {
    // User exists, check if they are registered as academy
    const existingRoles = existingUser.roles as any[];
    const existingRoleName = existingRoles && existingRoles.length > 0 ? existingRoles[0]?.name : null;
    
    if (existingRoleName === DefaultRoles.ACADEMY) {
      // If user is academy, add user role (keep academy role)
      const updatedUser = await userService.update(existingUser.id, { 
        role: DefaultRoles.USER,
        addRole: true,
        userType: type || null,
      });
      if (!updatedUser) {
        throw new ApiError(500, t('errors.internalServerError'));
      }
      user = updatedUser;
    } else if (existingRoleName === DefaultRoles.USER) {
      // User already has the user role, return existing user
      throw new ApiError(400, t('auth.register.emailExists'));
    } else {
      // User exists with different role, add user role (keep existing role)
      const updatedUser = await userService.update(existingUser.id, { 
        role: DefaultRoles.USER,
        addRole: true,
        userType: type || null,
      });
      if (!updatedUser) {
        throw new ApiError(500, t('errors.internalServerError'));
      }
      user = updatedUser;
    }
  } else {
    // Create new user
    user = await userService.create({
      id: uuidv4(),
      email,
      password,
      firstName,
      lastName,
      mobile,
      role: DefaultRoles.USER,
      userType: type || null, // Set userType when role is 'user'
      dob: dob ? new Date(dob) : null,
      gender: gender as any,
      isActive: true,
    });
  }

  // Get role name from populated roles array
  const roles = user.roles as any[];
  const roleName = roles && roles.length > 0 ? roles[0]?.name : DefaultRoles.USER;

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: roleName,
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Login user with email and password
 */
export const loginUser = async (data: UserLoginInput): Promise<LoginResult> => {
  const { email, password } = data;

  let user = await userService.findByEmailWithPassword(email);

  if (!user || !user.password) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  // Check password first
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  const roles = user.roles as any[];
  let userRole = roles && roles.length > 0 ? roles[0]?.name : null;
  
    // If user is registered as academy and trying to login as user, add user role (keep academy role)
    if (userRole === DefaultRoles.ACADEMY) {
      // Add user role to existing roles array (don't replace academy role)
      const updatedUser = await userService.update(user.id, { 
        role: DefaultRoles.USER,
        addRole: true,
      });
      if (updatedUser) {
        user = await userService.findByEmailWithPassword(email);
        if (!user) {
          throw new ApiError(500, t('errors.internalServerError'));
        }
        const updatedRoles = user.roles as any[];
        // Check if user has user role (could be first or second in array)
        const hasUserRole = updatedRoles.some((r: any) => r?.name === DefaultRoles.USER);
        userRole = hasUserRole ? DefaultRoles.USER : (updatedRoles[0]?.name || DefaultRoles.USER);
      }
    }

  // Check if user has user role (could be in roles array even if not first)
  if (!hasRole(user, DefaultRoles.USER)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, t('auth.login.inactive'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: userRole ?? DefaultRoles.USER,
  });

  // Refresh user data to get updated role
  const updatedUserData = await userService.findByEmail(email);
  const sanitizedUser = updatedUserData || userService.sanitize(user);
  if (!sanitizedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return {
    user: sanitizedUser,
    accessToken,
    refreshToken,
  };
};

/**
 * Social login for user
 */
export const socialLoginUser = async (data: UserSocialLoginInput): Promise<SocialLoginResult> => {
  const payload = data;

  const decodedToken = await firebaseAuthService.verifyIdToken(payload.idToken);

  const email = decodedToken.email?.toLowerCase();
  if (!email) {
    throw new ApiError(400, t('auth.social.missingEmail'));
  }

  let user = await userService.findByEmail(email);

  if (!user) {
    const nameFromToken = decodedToken.name ?? '';
    const [tokenFirstName, ...tokenLastParts] = nameFromToken.trim().split(/\s+/).filter(Boolean);
    const firstName =
      payload.firstName?.trim() ||
      tokenFirstName ||
      'User';
    const lastName =
      payload.lastName?.trim() ||
      (tokenLastParts.length ? tokenLastParts.join(' ') : decodedToken.family_name || null) ||
      null;

    user = await userService.create({
      id: uuidv4(),
      email,
      firstName,
      lastName,
      password: `${uuidv4()}!Social1`,
      role: DefaultRoles.USER,
      userType: payload.type || null, // Set userType when role is 'user'
      isActive: true,
    });
  } else {
    // User exists, if academy, add user role (keep academy role)
    const existingRoles = user.roles as any[];
    const existingRole = existingRoles && existingRoles.length > 0 ? existingRoles[0]?.name : null;
    if (existingRole === DefaultRoles.ACADEMY) {
      const updatedUser = await userService.update(user.id, { 
        role: DefaultRoles.USER,
        addRole: true,
        userType: payload.type || null,
      });
      if (updatedUser) {
        user = await userService.findByEmail(email);
        if (!user) {
          throw new ApiError(500, t('errors.internalServerError'));
        }
      }
    } else if (existingRole === DefaultRoles.USER && payload.type) {
      // Update userType if provided
      const updatedUser = await userService.update(user.id, { userType: payload.type });
      if (updatedUser) {
        user = updatedUser;
      }
    }
  }

  // Check if user has user role (could be in roles array even if not first)
  if (!hasRole(user, DefaultRoles.USER)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, t('auth.login.inactive'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: DefaultRoles.USER,
  });

  return {
    user,
    accessToken,
    refreshToken,
    provider: payload.provider ?? decodedToken.firebase?.sign_in_provider,
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  data: UserProfileUpdateInput,
  file?: Express.Multer.File
): Promise<User> => {
  const existingUser = await userService.findById(userId);
  if (!existingUser) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const updates: UpdateUserData = {};

  if (data.firstName) {
    updates.firstName = data.firstName;
  }

  if (data.lastName !== undefined) {
    updates.lastName = data.lastName ?? null;
  }

  if (data.dob) {
    updates.dob = new Date(data.dob);
  }

  if (data.gender) {
    updates.gender = data.gender as any;
  }

  // Handle profile image upload
  if (file) {
    try {
      logger.info('Starting profile image upload', {
        userId: existingUser.id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      // Delete old profile image if exists
      if (existingUser.profileImage) {
        try {
          await deleteFileFromS3(existingUser.profileImage);
          logger.info('Old profile image deleted', { oldImageUrl: existingUser.profileImage });
        } catch (deleteError) {
          logger.warn('Failed to delete old profile image, continuing with upload', deleteError);
          // Don't fail the upload if deletion fails
        }
      }

      // Upload new image to S3
      const imageUrl = await uploadFileToS3({
        file,
        folder: 'users',
        userId: existingUser.id,
      });

      updates.profileImage = imageUrl;
      logger.info('Profile image uploaded successfully', { imageUrl, userId: existingUser.id });
    } catch (error: any) {
      logger.error('Failed to upload profile image', {
        error: error?.message || error,
        stack: error?.stack,
        userId: existingUser.id,
        fileName: file?.originalname,
      });
      throw new ApiError(500, error?.message || t('auth.profile.imageUploadFailed'));
    }
  }

  if (!Object.keys(updates).length && !file) {
    throw new ApiError(400, t('validation.profile.noChanges'));
  }

  const updatedUser = await userService.update(existingUser.id, updates);
  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return updatedUser;
};

/**
 * Update user address
 */
export const updateUserAddress = async (
  userId: string,
  data: UserAddressUpdateInput
): Promise<User> => {
  const existingUser = await userService.findById(userId);
  if (!existingUser) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const updatedUser = await userService.update(existingUser.id, {
    address: {
      ...data.address,
      isDeleted: false,
    },
  });

  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  return updatedUser;
};

/**
 * Change user password
 */
export const changeUserPassword = async (
  userId: string,
  data: UserPasswordChangeInput
): Promise<void> => {
  const { currentPassword, newPassword } = data;

  const user = await userService.findByIdWithPassword(userId);
  if (!user || !user.password) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  const isCurrentValid = await comparePassword(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new ApiError(400, t('auth.profile.invalidCurrentPassword'));
  }

  await userService.update(user.id, { password: newPassword });
};

/**
 * Request password reset OTP for user
 */
export const requestUserPasswordReset = async (
  data: UserForgotPasswordRequestInput
): Promise<{ mode: string }> => {
  const otp = config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();

  if (data.mode === 'mobile') {
    const user = await userService.findByMobile(data.mobile);

    if (!user) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }

    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.USER)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    await otpService.createOtp(
      { channel: OtpChannel.MOBILE, identifier: data.mobile },
      otp,
      OtpMode.FORGOT_PASSWORD
    );

    const mobileNumber = `+91${data.mobile}`;
    await sendOtpSms(mobileNumber, otp);
  } else {
    const emailLower = data.email.toLowerCase();
    const user = await userService.findByEmail(emailLower);

    if (!user) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }

    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.USER)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    await otpService.createOtp(
      { channel: OtpChannel.EMAIL, identifier: emailLower },
      otp,
      OtpMode.FORGOT_PASSWORD
    );

    await sendPasswordResetEmail(emailLower, otp, {
      name: user.firstName || 'User',
    });
  }

  return { mode: data.mode };
};

/**
 * Verify password reset OTP and reset password for user
 */
export const verifyUserPasswordReset = async (
  data: UserForgotPasswordVerifyInput
): Promise<PasswordResetResult> => {
  const identifier =
    data.mode === 'mobile' ? data.mobile : data.email.toLowerCase();
  const channel = data.mode === 'mobile' ? OtpChannel.MOBILE : OtpChannel.EMAIL;

  const status = await otpService.verifyOtp(
    { channel, identifier },
    data.otp,
    OtpMode.FORGOT_PASSWORD
  );

  if (status !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found: t('auth.password.resetOtpInvalid'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[status] ?? t('auth.login.invalidOtp'));
  }

  const user =
    data.mode === 'mobile'
      ? await userService.findByMobile(data.mobile)
      : await userService.findByEmail(identifier);

  if (!user) {
    throw new ApiError(404, t('auth.password.resetUserNotFound'));
  }

  // Check if user has 'user' role (could be in roles array even if not first)
  if (!hasRole(user, DefaultRoles.USER)) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }
  
  // Validate userType for user role
  if (user.userType !== 'student' && user.userType !== 'guardian') {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  const updatedUser = await userService.update(user.id, {
    password: data.newPassword,
  });

  if (!updatedUser) {
    throw new ApiError(500, t('errors.internalServerError'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: updatedUser.id,
    email: updatedUser.email,
    role: getRoleName(updatedUser),
  });

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
};

/**
 * Get current user
 */
export const getCurrentUser = async (userId: string): Promise<User> => {
  const user = await userService.findById(userId);

  if (!user) {
    throw new ApiError(404, t('auth.profile.notFound'));
  }

  return user;
};

/**
 * Send OTP to mobile number for user
 */
export const sendUserOtp = async (data: {
  mobile: string;
  mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
}): Promise<OtpSendResult> => {
  const { mobile, mode = 'login' } = data;

  const existingUser = await userService.findByMobile(mobile);

  const otpModeMap: Record<string, OtpMode> = {
    login: OtpMode.LOGIN,
    register: OtpMode.REGISTER,
    profile_update: OtpMode.PROFILE_UPDATE,
    forgot_password: OtpMode.FORGOT_PASSWORD,
  };
  const otpMode = otpModeMap[mode] || OtpMode.LOGIN;

  if (mode === 'login') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    let userRole = getRoleName(existingUser);
    
    // If user is registered as academy and trying to login as user, add user role (keep academy role)
    if (userRole === DefaultRoles.ACADEMY) {
      // Add user role to existing roles array (don't replace academy role)
      const updatedUser = await userService.update(existingUser.id, { 
        role: DefaultRoles.USER,
        addRole: true,
      });
      if (updatedUser) {
        const updatedRoles = updatedUser.roles as any[];
        // Check if user has user role
        const hasUserRole = updatedRoles.some((r: any) => r?.name === DefaultRoles.USER);
        userRole = hasUserRole ? DefaultRoles.USER : userRole;
      }
    }
    
    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(existingUser, DefaultRoles.USER)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  } else if (mode === 'register') {
    if (existingUser) {
      // If user exists as academy, add user role (keep academy role) instead of throwing error
      const existingRole = getRoleName(existingUser);
      if (existingRole === DefaultRoles.ACADEMY) {
        await userService.update(existingUser.id, { 
          role: DefaultRoles.USER,
          addRole: true,
        });
      } else {
        throw new ApiError(400, t('auth.register.mobileExists'));
      }
    }
  } else if (mode === 'forgot_password') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }
    let userRole = getRoleName(existingUser);
    
    // If user is registered as academy, add user role (keep academy role)
    if (userRole === DefaultRoles.ACADEMY) {
      const updatedUser = await userService.update(existingUser.id, { 
        role: DefaultRoles.USER,
        addRole: true,
      });
      if (updatedUser) {
        const updatedRoles = updatedUser.roles as any[];
        // Check if user has user role
        const hasUserRole = updatedRoles.some((r: any) => r?.name === DefaultRoles.USER);
        userRole = hasUserRole ? DefaultRoles.USER : userRole;
      }
    }
    
    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(existingUser, DefaultRoles.USER)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  }

  const otp = config.nodeEnv === 'development' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
  await otpService.createOtp({ channel: OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);
  // add +91 to the mobile number
  const mobileNumber = `+91${mobile}`;
  await sendOtpSms(mobileNumber, otp);

  return {
    mobile: mobileNumber,
    mode,
  };
};

/**
 * Verify OTP for user
 */
export const verifyUserOtp = async (data: {
  mobile: string;
  otp: string;
  mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
}): Promise<OtpVerifyResult> => {
  const { mobile, otp, mode = 'login' } = data;

  const otpModeMap: Record<string, OtpMode> = {
    login: OtpMode.LOGIN,
    register: OtpMode.REGISTER,
    profile_update: OtpMode.PROFILE_UPDATE,
    forgot_password: OtpMode.FORGOT_PASSWORD,
  };
  const otpMode = otpModeMap[mode] || OtpMode.LOGIN;

  const status = await otpService.verifyOtp({ channel: OtpChannel.MOBILE, identifier: mobile }, otp, otpMode);

  if (status !== 'valid') {
    const messageMap: Record<string, string> = {
      not_found:
        mode === 'register'
          ? t('auth.register.otpResend')
          : mode === 'profile_update'
          ? t('auth.profile.mobileVerificationFailed')
          : mode === 'forgot_password'
          ? t('auth.password.resetOtpInvalid')
          : t('auth.login.mobileNotFound'),
      consumed: t('auth.login.otpUsed'),
      expired: t('auth.login.otpExpired'),
      invalid: t('auth.login.invalidOtp'),
    };

    throw new ApiError(400, messageMap[status] ?? t('auth.login.invalidOtp'));
  }

  if (mode === 'login') {
    let user = await userService.findByMobile(mobile);

    if (!user) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    let userRole = getRoleName(user);
    
    // If user is registered as academy and trying to login as user, add user role (keep academy role)
    if (userRole === DefaultRoles.ACADEMY) {
      // Add user role to existing roles array (don't replace academy role)
      const updatedUser = await userService.update(user.id, { 
        role: DefaultRoles.USER,
        addRole: true,
      });
      if (updatedUser) {
        user = await userService.findByMobile(mobile);
        if (!user) {
          throw new ApiError(500, t('errors.internalServerError'));
        }
        const updatedRoles = user.roles as any[];
        // Check if user has user role
        const hasUserRole = updatedRoles.some((r: any) => r?.name === DefaultRoles.USER);
        userRole = hasUserRole ? DefaultRoles.USER : userRole;
      }
    }

    // Check if user has user role (could be in roles array even if not first)
    if (!hasRole(user, DefaultRoles.USER)) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError(403, t('auth.login.inactive'));
    }

    // Use user role for token (even if academy is first in array)
    const userRoleForToken = hasRole(user, DefaultRoles.USER) ? DefaultRoles.USER : getRoleName(user);
    const { accessToken, refreshToken } = generateTokenPair({
      id: user.id,
      email: user.email,
      role: userRoleForToken,
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  return {};
};

