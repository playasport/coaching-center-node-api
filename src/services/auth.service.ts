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

  // Get role name from populated role object
  const roleName = (user.role as any)?.name ?? DefaultRoles.USER;

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

  const user = await userService.findByEmailWithPassword(email);

  if (!user || !user.password) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
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
    role: (user.role as any)?.name ?? DefaultRoles.USER,
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

  if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
    throw new ApiError(403, t('auth.login.invalidRole'));
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, t('auth.login.inactive'));
  }

  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: (user.role as any)?.name ?? DefaultRoles.USER,
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

    if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
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

    if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
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

  if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
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
    role: (updatedUser.role as any)?.name ?? DefaultRoles.USER,
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

    if ((existingUser.role as any)?.name !== DefaultRoles.ACADEMY) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  } else if (mode === 'register') {
    if (existingUser) {
      throw new ApiError(400, t('auth.register.mobileExists'));
    }
  } else if (mode === 'forgot_password') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }
    if ((existingUser.role as any)?.name !== DefaultRoles.ACADEMY) {
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
    const user = await userService.findByMobile(mobile);

    if (!user) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    if ((user.role as any)?.name !== DefaultRoles.ACADEMY) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError(403, t('auth.login.inactive'));
    }

    const { accessToken, refreshToken } = generateTokenPair({
      id: user.id,
      email: user.email,
      role: (user.role as any)?.name ?? DefaultRoles.USER,
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
    role: (user.role as any)?.name ?? DefaultRoles.USER,
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
  const { firstName, lastName, email, password, mobile, role, dob, gender, otp } = data;

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
    role: role === 'student' ? DefaultRoles.STUDENT : DefaultRoles.GUARDIAN,
    dob: dob ? new Date(dob) : null,
    gender: gender as any,
    isActive: true,
  });

  // Get role name from populated role object
  const roleName = (user.role as any)?.name ?? DefaultRoles.USER;

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

  const user = await userService.findByEmailWithPassword(email);

  if (!user || !user.password) {
    throw new ApiError(401, t('auth.login.invalidCredentials'));
  }

  const userRole = (user.role as any)?.name;
  if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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
    role: userRole ?? DefaultRoles.USER,
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

    // Default to student if role not provided
    const userRole = payload.role === 'guardian' ? DefaultRoles.GUARDIAN : DefaultRoles.STUDENT;

    user = await userService.create({
      id: uuidv4(),
      email,
      firstName,
      lastName,
      password: `${uuidv4()}!Social1`,
      role: userRole,
      isActive: true,
    });
  }

  const userRole = (user.role as any)?.name;
  if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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

    const userRole = (user.role as any)?.name;
    if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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

    const userRole = (user.role as any)?.name;
    if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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

  const userRole = (user.role as any)?.name;
  if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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
    role: userRole ?? DefaultRoles.USER,
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

    const userRole = (existingUser.role as any)?.name;
    if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }
  } else if (mode === 'register') {
    if (existingUser) {
      throw new ApiError(400, t('auth.register.mobileExists'));
    }
  } else if (mode === 'forgot_password') {
    if (!existingUser) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }
    const userRole = (existingUser.role as any)?.name;
    if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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
    const user = await userService.findByMobile(mobile);

    if (!user) {
      throw new ApiError(404, t('auth.login.mobileNotFound'));
    }

    const userRole = (user.role as any)?.name;
    if (userRole !== DefaultRoles.STUDENT && userRole !== DefaultRoles.GUARDIAN) {
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

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  return {};
};

