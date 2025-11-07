import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import { t } from '../utils/i18n';
import { AdminApproveStatus } from '../enums/adminApprove.enum';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      email,
      password,
      coachingName,
      firstName,
      lastName,
      mobileNumber,
      contactEmail,
      contactNumber,
    } = req.body;

    // Check if user already exists
    const existingCentre = await prisma.coachingCentre.findUnique({
      where: { email },
    });

    if (existingCentre) {
      res.status(400).json({
        success: false,
        message: t('auth.register.emailExists'),
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create coaching centre record
    const centre = await prisma.coachingCentre.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        coachingName,
        firstName: firstName || null,
        lastName: lastName || null,
        mobileNumber: mobileNumber || null,
        contactEmail: contactEmail || null,
        contactNumber: contactNumber || null,
        signupDateTime: new Date(),
        isActive: true,
        isAdminApprove: 'pending_approval',
      },
      select: {
        id: true,
        email: true,
        coachingName: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        isAdminApprove: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({
      id: centre.id,
      email: centre.email ?? '',
      role: 'coaching_centre',
    });

    res.status(201).json({
      success: true,
      message: t('auth.register.success'),
      data: {
        coachingCentre: centre,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const centre = await prisma.coachingCentre.findUnique({
      where: { email },
    });

    if (!centre) {
      res.status(401).json({
        success: false,
        message: t('auth.login.invalidCredentials'),
      });
      return;
    }

    // Verify password
    const isPasswordValid = centre.password
      ? await comparePassword(password, centre.password)
      : false;

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: t('auth.login.invalidCredentials'),
      });
      return;
    }

    if (!centre.isActive) {
      res.status(403).json({
        success: false,
        message: t('auth.login.inactive'),
      });
      return;
    }

    if (centre.isAdminApprove !== AdminApproveStatus.APPROVE) {
      const messageKey =
        centre.isAdminApprove === AdminApproveStatus.REJECT
          ? 'auth.login.rejected'
          : 'auth.login.pendingApproval';

      res.status(403).json({
        success: false,
        message: t(messageKey),
      });
      return;
    }

    // Generate token
    const token = generateToken({
      id: centre.id,
      email: centre.email ?? '',
      role: 'coaching_centre',
    });

    res.json({
      success: true,
      message: t('auth.login.success'),
      data: {
        coachingCentre: {
          id: centre.id,
          email: centre.email,
          coachingName: centre.coachingName,
          firstName: centre.firstName,
          lastName: centre.lastName,
          mobileNumber: centre.mobileNumber,
          isActive: centre.isActive,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: t('auth.profile.unauthorized'),
      });
      return;
    }

    const coachingCentre = await prisma.coachingCentre.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        coachingName: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        isAdminApprove: true,
        isActive: true,
        signupDateTime: true,
        updatedAt: true,
      },
    });

    if (!coachingCentre) {
      res.status(404).json({
        success: false,
        message: t('auth.profile.notFound'),
      });
      return;
    }

    res.json({
      success: true,
      data: { coachingCentre },
    });
  } catch (error) {
    next(error);
  }
};


