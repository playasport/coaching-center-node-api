import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';
import { hashPassword } from '../../utils/password';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import type { CreateAdminUserInput, UpdateAdminUserInput } from '../../validations/adminUser.validation';

/**
 * Create user (admin)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateAdminUserInput = req.body;

    // Check if email already exists
    const existingUser = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'Email already exists');
    }

    // Validate and get roles
    const roles = await RoleModel.find({ name: { $in: data.roles } });
    if (roles.length !== data.roles.length) {
      throw new ApiError(400, 'One or more roles are invalid');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Generate unique user ID
    const userId = uuidv4();

    // Create user
    const user = await UserModel.create({
      id: userId,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      password: hashedPassword,
      gender: data.gender ?? null,
      dob: data.dob ?? null,
      roles: roles.map((role) => role._id),
      userType: data.userType ?? null,
      isActive: data.isActive ?? true,
      address: data.address ?? null,
      isDeleted: false,
    });

    // Populate roles before returning
    const populatedUser = await UserModel.findById(user._id)
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    logger.info(`Admin created user: ${userId} (${data.email})`);

    const response = new ApiResponse(201, { user: populatedUser }, t('admin.users.created') || 'User created successfully');
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Create user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get all users (admin view)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find({ isDeleted: false })
        .select('-password')
        .populate('roles', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments({ isDeleted: false }),
    ]);

    const response = new ApiResponse(
      200,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
      t('admin.users.retrieved')
    );
    res.json(response);
  } catch (error) {
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get user by ID (admin view)
 * Supports both UUID id and MongoDB _id for backward compatibility
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Build query - support both UUID id and MongoDB _id
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      // Try MongoDB _id first (24 hex characters)
      query = UserModel.findOne({
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false },
          { id, isDeleted: false }
        ]
      });
    } else {
      // Try UUID id format
      query = UserModel.findOne({ id, isDeleted: false });
    }

    const user = await query
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    const response = new ApiResponse(200, { user }, t('admin.users.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update user (admin)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateAdminUserInput = req.body;

    // Build query - support both UUID id and MongoDB _id
    let findQuery: any;
    let updateQuery: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      // Try MongoDB _id first (24 hex characters)
      findQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false },
          { id, isDeleted: false }
        ]
      };
      updateQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false },
          { id, isDeleted: false }
        ]
      };
    } else {
      // Try UUID id format
      findQuery = { id, isDeleted: false };
      updateQuery = { id, isDeleted: false };
    }

    // Check if user exists
    const existingUser = await UserModel.findOne(findQuery);
    if (!existingUser) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    // Prepare update data
    const updateData: any = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName ?? null;
    }
    if (data.mobile !== undefined) {
      updateData.mobile = data.mobile ?? null;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender ?? null;
    }
    if (data.dob !== undefined) {
      updateData.dob = data.dob ?? null;
    }
    if (data.userType !== undefined) {
      updateData.userType = data.userType ?? null;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.address !== undefined) {
      updateData.address = data.address ?? null;
    }

    // Handle roles update if provided
    if (data.roles && data.roles.length > 0) {
      const roles = await RoleModel.find({ name: { $in: data.roles } });
      if (roles.length !== data.roles.length) {
        throw new ApiError(400, 'One or more roles are invalid');
      }
      updateData.roles = roles.map((role) => role._id);
    }

    // Update user
    const user = await UserModel.findOneAndUpdate(
      updateQuery,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    logger.info(`Admin updated user: ${id}`);

    const response = new ApiResponse(200, { user }, t('admin.users.updated') || 'User updated successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete user (admin - soft delete)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Build query - support both UUID id and MongoDB _id
    let deleteQuery: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      // Try MongoDB _id first (24 hex characters)
      deleteQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false },
          { id, isDeleted: false }
        ]
      };
    } else {
      // Try UUID id format
      deleteQuery = { id, isDeleted: false };
    }

    const user = await UserModel.findOneAndUpdate(
      deleteQuery,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    const response = new ApiResponse(200, null, t('admin.users.deleted'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
