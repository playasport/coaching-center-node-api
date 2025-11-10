import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { t } from '../utils/i18n';
import { userService, UpdateUserData } from '../services/user.service';
import { DefaultRoles } from '../models/role.model';
import { comparePassword } from '../utils';
import { generateToken } from '../utils/jwt';
import { sendOtpSms } from '../services/sms.service';
import { sendPasswordResetEmail } from '../services/email.service';
import { otpService } from '../services/otp.service';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import type {
  AcademyRegisterInput,
  AcademyLoginInput,
  AcademyProfileUpdateInput,
  AcademyPasswordChangeInput,
  AcademyForgotPasswordRequestInput,
  AcademyForgotPasswordVerifyInput,
} from '../validations/auth.validation';

export const registerAcademyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, mobile, isVerified } =
      req.body as AcademyRegisterInput;

    if (!isVerified) {
      throw new ApiError(400, t('auth.register.mobileNotVerified'));
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

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role?.id ?? DefaultRoles.USER,
    });

    const response = new ApiResponse(
      201,
      {
        user,
        token,
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
    const { email, password } = req.body as AcademyLoginInput;

    const user = await userService.findByEmailWithPassword(email);

    if (!user || !user.password) {
      throw new ApiError(401, t('auth.login.invalidCredentials'));
    }

    if (user.role?.id !== DefaultRoles.ACADEMY) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError(403, t('auth.login.inactive'));
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, t('auth.login.invalidCredentials'));
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role?.id ?? DefaultRoles.USER,
    });

    const response = new ApiResponse(200, {
      user: userService.sanitize(user),
      token,
    }, t('auth.login.success'));
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

    const existingUser = await userService.findById(req.user.id);
    if (!existingUser) {
      throw new ApiError(404, t('auth.profile.notFound'));
    }

    const updates: UpdateUserData = {};

    if (payload.firstName) {
      updates.firstName = payload.firstName;
    }

    if (payload.lastName !== undefined) {
      updates.lastName = payload.lastName ?? null;
    }

    if (payload.gender) {
      updates.gender = payload.gender;
    }

    if (payload.address) {
      updates.address = {
        ...payload.address,
        isDeleted: false,
      };
    }

    if (payload.email) {
      const emailLower = payload.email.toLowerCase();
      if (!existingUser.email || emailLower !== existingUser.email.toLowerCase()) {
        const emailOwner = await userService.findByEmail(emailLower);
        if (emailOwner && emailOwner.id !== existingUser.id) {
          throw new ApiError(400, t('auth.register.emailExists'));
        }
        updates.email = emailLower;
      }
    }

    if (payload.mobile) {
      const isSameMobile = existingUser.mobile === payload.mobile;

      if (!isSameMobile) {
        if (!payload.mobileOtp) {
          throw new ApiError(400, t('validation.otp.required'));
        }

        const otpStatus = await otpService.verifyOtp(
          { channel: 'mobile', identifier: payload.mobile },
          payload.mobileOtp,
          'profile_update'
        );

        if (otpStatus !== 'valid') {
          const messageMap: Record<string, string> = {
            not_found: t('auth.profile.mobileVerificationFailed'),
            consumed: t('auth.login.otpUsed'),
            expired: t('auth.login.otpExpired'),
            invalid: t('auth.login.invalidOtp'),
          };

          throw new ApiError(400, messageMap[otpStatus] ?? t('auth.login.invalidOtp'));
        }

        const mobileOwner = await userService.findByMobile(payload.mobile);
        if (mobileOwner && mobileOwner.id !== existingUser.id) {
          throw new ApiError(400, t('auth.register.mobileExists'));
        }

        updates.mobile = payload.mobile;
      }
    }

    if (!Object.keys(updates).length) {
      throw new ApiError(400, t('validation.profile.noChanges'));
    }

    const updatedUser = await userService.update(existingUser.id, updates);
    if (!updatedUser) {
      throw new ApiError(500, t('errors.internalServerError'));
    }

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

    const { currentPassword, newPassword } = req.body as AcademyPasswordChangeInput;

    const user = await userService.findByIdWithPassword(req.user.id);
    if (!user || !user.password) {
      throw new ApiError(404, t('auth.profile.notFound'));
    }

    const isCurrentValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new ApiError(400, t('auth.profile.invalidCurrentPassword'));
    }

    await userService.update(user.id, { password: newPassword });

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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (payload.mode === 'mobile') {
      const user = await userService.findByMobile(payload.mobile);

      if (!user) {
        throw new ApiError(404, t('auth.password.resetUserNotFound'));
      }

      if (user.role?.id !== DefaultRoles.ACADEMY) {
        throw new ApiError(403, t('auth.login.invalidRole'));
      }

      await otpService.createOtp(
        { channel: 'mobile', identifier: payload.mobile },
        otp,
        'forgot_password'
      );

      const mobileNumber = `+91${payload.mobile}`;
      await sendOtpSms(mobileNumber, otp);
    } else {
      const emailLower = payload.email.toLowerCase();
      const user = await userService.findByEmail(emailLower);

      if (!user) {
        throw new ApiError(404, t('auth.password.resetUserNotFound'));
      }

      if (user.role?.id !== DefaultRoles.ACADEMY) {
        throw new ApiError(403, t('auth.login.invalidRole'));
      }

      await otpService.createOtp(
        { channel: 'email', identifier: emailLower },
        otp,
        'forgot_password'
      );

      await sendPasswordResetEmail(emailLower, otp, {
        name: user.firstName || 'User',
      });
    }

    const response = new ApiResponse(
      200,
      { mode: payload.mode },
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

    const identifier =
      payload.mode === 'mobile' ? payload.mobile : payload.email.toLowerCase();
    const channel = payload.mode === 'mobile' ? 'mobile' : 'email';

    const status = await otpService.verifyOtp(
      { channel, identifier },
      payload.otp,
      'forgot_password'
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
      payload.mode === 'mobile'
        ? await userService.findByMobile(payload.mobile)
        : await userService.findByEmail(identifier);

    if (!user) {
      throw new ApiError(404, t('auth.password.resetUserNotFound'));
    }

    if (user.role?.id !== DefaultRoles.ACADEMY) {
      throw new ApiError(403, t('auth.login.invalidRole'));
    }

    const updatedUser = await userService.update(user.id, {
      password: payload.newPassword,
    });

    if (!updatedUser) {
      throw new ApiError(500, t('errors.internalServerError'));
    }

    const token = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role?.id ?? DefaultRoles.USER,
    });

    const response = new ApiResponse(
      200,
      {
        user: updatedUser,
        token,
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

    const user = await userService.findById(req.user.id);

    if (!user) {
      throw new ApiError(404, t('auth.profile.notFound'));
    }

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

    const existingUser = await userService.findByMobile(mobile);

    if (mode === 'login') {
      if (!existingUser) {
        throw new ApiError(404, t('auth.login.mobileNotFound'));
      }

      if (existingUser.role?.id !== DefaultRoles.ACADEMY) {
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
      if (existingUser.role?.id !== DefaultRoles.ACADEMY) {
        throw new ApiError(403, t('auth.login.invalidRole'));
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await otpService.createOtp({ channel: 'mobile', identifier: mobile }, otp, mode);
    // add +91 to the mobile number
    const mobileNumber = `+91${mobile}`;
    await sendOtpSms(mobileNumber, otp);

    const response = new ApiResponse(200, {
      mobile: mobileNumber,
      mode,
    }, t('auth.login.otpSent'));

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

    const status = await otpService.verifyOtp({ channel: 'mobile', identifier: mobile }, otp, mode);

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

      if (user.role?.id !== DefaultRoles.ACADEMY) {
        throw new ApiError(403, t('auth.login.invalidRole'));
      }

      if (!user.isActive || user.isDeleted) {
        throw new ApiError(403, t('auth.login.inactive'));
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role?.id ?? DefaultRoles.USER,
      });

      const response = new ApiResponse(
        200,
        {
          user,
          token,
        },
        t('auth.login.success')
      );

      res.json(response);
      return;
    }

    const response = new ApiResponse(200, null, t('auth.login.otpVerified'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};


