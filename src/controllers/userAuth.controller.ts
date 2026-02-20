import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { DeviceType } from '../enums/deviceType.enum';
import * as authService from '../services/client/auth.service';
import { deviceTokenService } from '../services/common/deviceToken.service';
import type {
  UserRegisterInput,
  UserSocialLoginInput,
  UserProfileUpdateInput,
  UserAddressUpdateInput,
  UserPasswordChangeInput,
  UserFavoriteSportsUpdateInput,
  SaveFcmTokenInput,
} from '../validations/auth.validation';
import { userService } from '../services/client/user.service';

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

    await authService.updateUserProfile(req.user.id, payload, file);

    // Get the updated user in the same format as /me route
    const user = await authService.getCurrentUser(req.user.id);

    const response = new ApiResponse(200, { ...user }, t('auth.profile.updateSuccess'));
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
    await authService.updateUserAddress(req.user.id, payload);

    // Get the updated user in the same format as /me route
    const user = await authService.getCurrentUser(req.user.id);

    const response = new ApiResponse(200, { ...user }, t('auth.profile.updateSuccess'));
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

    const response = new ApiResponse(200, { ...user }, t('auth.profile.meSuccess'));
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
    
    // Validate sport IDs exist if provided and convert to ObjectIds
    let sportObjectIdsForStorage: string[] = [];
    
    if (payload.favoriteSports && payload.favoriteSports.length > 0) {
      const { SportModel } = await import('../models/sport.model');
      const { Types } = await import('mongoose');
      
      // Separate ObjectIds and custom_ids
      const objectIdArray: string[] = [];
      const customIdArray: string[] = [];
      
      payload.favoriteSports.forEach((id) => {
        if (Types.ObjectId.isValid(id)) {
          objectIdArray.push(id);
        } else {
          customIdArray.push(id);
        }
      });

      // Build query to find sports by both _id and custom_id
      const query: any = {
        is_active: true,
        $or: [],
      };

      if (objectIdArray.length > 0) {
        query.$or.push({ _id: { $in: objectIdArray.map((id) => new Types.ObjectId(id)) } });
      }

      if (customIdArray.length > 0) {
        query.$or.push({ custom_id: { $in: customIdArray } });
      }

      // Check if all sports exist and are active
      const existingSports = await SportModel.find(query)
        .select('_id custom_id')
        .lean();

      // Create maps for lookup
      const sportByIdMap = new Map<string, string>(); // input ID -> MongoDB _id
      const sportByCustomIdMap = new Map<string, string>(); // custom_id -> MongoDB _id

      existingSports.forEach((sport: any) => {
        const mongoId = sport._id.toString();
        if (sport.custom_id) {
          sportByCustomIdMap.set(sport.custom_id, mongoId);
        }
        sportByIdMap.set(mongoId, mongoId);
      });

      // Find missing sport IDs and collect valid ObjectIds for storage
      const missingSportIds: string[] = [];
      
      payload.favoriteSports.forEach((id) => {
        let mongoId: string | undefined;
        
        if (Types.ObjectId.isValid(id)) {
          // Check if ObjectId exists
          mongoId = sportByIdMap.get(id);
        } else {
          // Check if custom_id exists
          mongoId = sportByCustomIdMap.get(id);
        }

        if (mongoId) {
          sportObjectIdsForStorage.push(mongoId);
        } else {
          missingSportIds.push(id);
        }
      });

      if (missingSportIds.length > 0) {
        throw new ApiError(404, `Sport(s) not found or inactive: ${missingSportIds.join(', ')}`);
      }
    }

    await userService.update(req.user.id, {
      favoriteSports: sportObjectIdsForStorage,
    });

    // Get the updated user in the same format as /me route
    const user = await authService.getCurrentUser(req.user.id);

    const response = new ApiResponse(
      200,
      { ...user },
      'Favorite sports updated successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Save FCM token for push notifications (user)
 */
export const saveFcmToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as SaveFcmTokenInput;
    await deviceTokenService.registerOrUpdateDeviceToken({
      userId: req.user.id,
      fcmToken: data.fcmToken,
      deviceType: data.deviceType as DeviceType,
      deviceId: data.deviceId ?? undefined,
      deviceName: data.deviceName ?? undefined,
      appVersion: data.appVersion ?? undefined,
    });

    const response = new ApiResponse(200, null, t('auth.fcmToken.saved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

