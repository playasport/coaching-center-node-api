import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as authService from '../services/auth.service';
import type {
  UserRegisterInput,
  UserSocialLoginInput,
  UserProfileUpdateInput,
  UserAddressUpdateInput,
  UserPasswordChangeInput,
  UserFavoriteSportsUpdateInput,
} from '../validations/auth.validation';
import { userService } from '../services/user.service';

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as UserRegisterInput;
    const result = await authService.registerUser(data);

    const response = new ApiResponse(
      201,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'User registered successfully'
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const socialLoginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as UserSocialLoginInput;
    const result = await authService.socialLoginUser(payload);

    const response = new ApiResponse(
      200,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        provider: result.provider,
      },
      t('auth.social.loginSuccess')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const payload = req.body as UserProfileUpdateInput;
    const file = req.file;

    const updatedUser = await authService.updateUserProfile(req.user.id, payload, file);

    const response = new ApiResponse(200, { user: updatedUser }, t('auth.profile.updateSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUserAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const payload = req.body as UserAddressUpdateInput;
    const updatedUser = await authService.updateUserAddress(req.user.id, payload);

    const response = new ApiResponse(200, { user: updatedUser }, t('auth.profile.updateSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const changeUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const data = req.body as UserPasswordChangeInput;
    await authService.changeUserPassword(req.user.id, data);

    const response = new ApiResponse(200, null, t('auth.profile.passwordChanged'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const user = await authService.getCurrentUser(req.user.id);

    const response = new ApiResponse(200, { user }, t('auth.profile.meSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const sendUserOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, mode = 'login' } = req.body as {
      mobile: string;
      mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
    };

    const result = await authService.sendUserOtp({ mobile, mode });

    const response = new ApiResponse(
      200,
      {
        mobile: result.mobile,
        mode: result.mode,
      },
      t('auth.login.otpSent')
    );

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const verifyUserOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, otp, mode = 'login' } = req.body as {
      mobile: string;
      otp: string;
      mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
      fcmToken?: string;
      deviceType?: 'web' | 'android' | 'ios';
      deviceId?: string;
      deviceName?: string;
      appVersion?: string;
    };

    const result = await authService.verifyUserOtp({ mobile, otp, mode, ...req.body });

    if (result.user && result.accessToken && result.refreshToken) {
      // Login mode - user exists, return tokens
      const response = new ApiResponse(
        200,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        t('auth.login.success')
      );

      res.json(response);
      return;
    }

    if (result.needsRegistration && result.tempToken) {
      // Login mode - user doesn't exist, return registration flag and temp token
      const response = new ApiResponse(
        200,
        {
          needsRegistration: true,
          tempToken: result.tempToken,
        },
        'OTP verified. Please complete registration.'
      );

      res.json(response);
      return;
    }

    // Other modes - just verify
    const response = new ApiResponse(200, null, t('auth.login.otpVerified'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };
    const result = await authService.refreshToken(token);

    const response = new ApiResponse(
      200,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      t('auth.token.refreshed')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user - blacklist current tokens
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const { refreshToken } = req.body as { refreshToken?: string };

    await authService.logout(req.user.id, accessToken, refreshToken);

    const response = new ApiResponse(200, null, t('auth.logout.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from all devices - blacklist all user tokens
 */
export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    await authService.logoutAll(req.user.id);

    const response = new ApiResponse(200, null, t('auth.logout.allSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUserFavoriteSports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const payload = req.body as UserFavoriteSportsUpdateInput;
    const updatedUser = await userService.update(req.user.id, {
      favoriteSports: payload.favoriteSports,
    });

    if (!updatedUser) {
      throw new ApiError(404, t('auth.profile.notFound'));
    }

    const response = new ApiResponse(
      200,
      { user: updatedUser },
      'Favorite sports updated successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

