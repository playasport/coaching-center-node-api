import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { t } from '../utils/i18n';
import { userService } from '../services/user.service';
import { DefaultRoles } from '../models/role.model';
import { comparePassword } from '../utils';
import { generateToken } from '../utils/jwt';
import { sendOtpSms } from '../services/sms.service';
import { otpService } from '../services/otp.service';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import type { AcademyRegisterInput, AcademyLoginInput } from '../validations/auth.validation';

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

    const response = new ApiResponse(201, { user }, t('auth.register.success'));
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

export const sendAcademyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, mode = 'login' } = req.body as { mobile: string; mode?: 'login' | 'register' };

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
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await otpService.createOtp(mobile, otp, mode);
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
      mode?: 'login' | 'register';
    };

    const status = await otpService.verifyOtp(mobile, otp, mode);

    if (status !== 'valid') {
      const messageMap: Record<string, string> = {
        not_found:
          mode === 'register'
            ? t('auth.register.otpResend')
            : t('auth.login.mobileNotFound'),
        consumed: t('auth.login.otpUsed'),
        expired: t('auth.login.otpExpired'),
        invalid: t('auth.login.invalidOtp'),
      };

      throw new ApiError(400, messageMap[status] ?? t('auth.login.invalidOtp'));
    }

    const response = new ApiResponse(200, null, t('auth.login.otpVerified'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};


