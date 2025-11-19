import { Request, Response, NextFunction } from 'express';
import { t } from '../../utils/i18n';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as academyAuthService from '../../services/auth.service';
import type {
  AcademyRegisterInput,
  AcademyLoginInput,
  AcademySocialLoginInput,
  AcademyProfileUpdateInput,
  AcademyAddressUpdateInput,
  AcademyPasswordChangeInput,
  AcademyForgotPasswordRequestInput,
  AcademyForgotPasswordVerifyInput,
} from '../../validations/auth.validation';

export const registerAcademyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as AcademyRegisterInput;
    const result = await academyAuthService.registerAcademyUser(data);

    const response = new ApiResponse(
      201,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      t('auth.register.success')
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const loginAcademyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as AcademyLoginInput;
    const result = await academyAuthService.loginAcademyUser(data);

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
  } catch (error) {
    next(error);
  }
};

export const socialLoginAcademyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as AcademySocialLoginInput;
    const result = await academyAuthService.socialLoginAcademyUser(payload);

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

export const updateAcademyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const payload = req.body as AcademyProfileUpdateInput;
    const file = req.file;

    const updatedUser = await academyAuthService.updateAcademyProfile(req.user.id, payload, file);

    const response = new ApiResponse(200, { user: updatedUser }, t('auth.profile.updateSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateAcademyAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const payload = req.body as AcademyAddressUpdateInput;
    const updatedUser = await academyAuthService.updateAcademyAddress(req.user.id, payload);

    const response = new ApiResponse(200, { user: updatedUser }, t('auth.profile.updateSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const changeAcademyPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const data = req.body as AcademyPasswordChangeInput;
    await academyAuthService.changeAcademyPassword(req.user.id, data);

    const response = new ApiResponse(200, null, t('auth.profile.passwordChanged'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const requestAcademyPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as AcademyForgotPasswordRequestInput;
    const result = await academyAuthService.requestAcademyPasswordReset(payload);

    const response = new ApiResponse(
      200,
      { mode: result.mode },
      t('auth.password.resetOtpSent')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const verifyAcademyPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body as AcademyForgotPasswordVerifyInput;
    const result = await academyAuthService.verifyAcademyPasswordReset(payload);

    const response = new ApiResponse(
      200,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      t('auth.password.resetSuccess')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getCurrentAcademyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.profile.unauthorized'));
    }

    const user = await academyAuthService.getCurrentAcademyUser(req.user.id);

    const response = new ApiResponse(200, { user }, t('auth.profile.meSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const sendAcademyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, mode = 'login' } = req.body as {
      mobile: string;
      mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
    };

    const result = await academyAuthService.sendAcademyOtp({ mobile, mode });

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

export const verifyAcademyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, otp, mode = 'login' } = req.body as {
      mobile: string;
      otp: string;
      mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
    };

    const result = await academyAuthService.verifyAcademyOtp({ mobile, otp, mode });

    if (result.user && result.accessToken && result.refreshToken) {
      // Login mode - return tokens
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
    const result = await academyAuthService.refreshToken(token);

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

    await academyAuthService.logout(req.user.id, accessToken, refreshToken);

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

    await academyAuthService.logoutAll(req.user.id);

    const response = new ApiResponse(200, null, t('auth.logout.allSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};
