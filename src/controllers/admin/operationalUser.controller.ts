import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { AdminUserModel } from '../../models/adminUser.model';
import { RoleModel } from '../../models/role.model';
import { hashPassword } from '../../utils/password';
import { generateSecurePassword } from '../../utils/passwordGenerator';
import { sendAccountCredentialsEmail } from '../../services/common/email.service';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import type { CreateOperationalUserInput, UpdateOperationalUserInput } from '../../validations/operationalUser.validation';

/**
 * Check if address object has all required fields for Mongoose schema
 * Required fields: line2, city, state, country, pincode
 * Note: line1 is optional (can be null)
 */
const isAddressComplete = (address: any): boolean => {
  if (!address || typeof address !== 'object') {
    return false;
  }
  return !!(
    address.line2 &&
    address.city &&
    address.state &&
    (address.country || 'India') && // Default to India if not provided
    address.pincode
  );
};

/**
 * Create operational user (any role except user/academy/super_admin)
 */
export const createOperationalUser = async (req: Request, res: Response): Promise<void> => {
  const data: CreateOperationalUserInput = req.body;
  try {
    // Check if email and mobile already exist (parallel queries)
    const [existingUserByEmail, existingUserByMobile] = await Promise.all([
      AdminUserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false }).lean(),
      data.mobile ? AdminUserModel.findOne({ mobile: data.mobile, isDeleted: false }).lean() : Promise.resolve(null),
    ]);

    if (existingUserByEmail) {
      throw new ApiError(400, t('admin.users.emailExists'));
    }

    if (data.mobile && existingUserByMobile) {
      throw new ApiError(400, t('admin.users.mobileExists'));
    }

    // Validate and get roles (support both role names and ObjectIds)
    const roleNames: string[] = [];
    const roleIds: Types.ObjectId[] = [];
    
    for (const input of data.roles) {
      if (Types.ObjectId.isValid(input)) {
        roleIds.push(new Types.ObjectId(input));
      } else {
        roleNames.push(input);
      }
    }
    
    // Build query for roles
    let rolesQuery: any;
    if (roleNames.length > 0 && roleIds.length > 0) {
      rolesQuery = {
        $or: [
          { name: { $in: roleNames } },
          { _id: { $in: roleIds } }
        ]
      };
    } else if (roleNames.length > 0) {
      rolesQuery = { name: { $in: roleNames } };
    } else if (roleIds.length > 0) {
      rolesQuery = { _id: { $in: roleIds } };
    } else {
      throw new ApiError(400, 'Invalid roles format');
    }
    
    const roles = await RoleModel.find(rolesQuery);
    
    if (roles.length !== data.roles.length) {
      throw new ApiError(400, 'One or more roles are invalid');
    }

    // Generate secure random password
    const generatedPassword = generateSecurePassword(12);
    const hashedPassword = await hashPassword(generatedPassword);

    // Generate unique user ID
    const userId = uuidv4();

    // Validate address
    let address = null;
    if (data.address && isAddressComplete(data.address)) {
      address = {
        line1: data.address.line1 ?? null,
        ...data.address,
        country: data.address.country || 'India',
      };
    }

    // Create user (operational users don't have userType)
    const user = await AdminUserModel.create({
      id: userId,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      password: hashedPassword,
      gender: data.gender ?? null,
      dob: data.dob ?? null,
      roles: roles.map((role) => role._id),
      isActive: data.isActive ?? true,
      address: address,
      isDeleted: false,
    });

    // Populate roles before returning
    const populatedUser = await AdminUserModel.findById(user._id)
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!populatedUser) {
      logger.error('Operational user created but not found after creation', { userId, user_id: user._id });
      throw new ApiError(500, 'Failed to create operational user');
    }

    logger.info(`Admin created operational user: ${userId} (${data.email})`);

    // Send account credentials email asynchronously (don't wait for it)
    // This prevents email sending from blocking the API response
    const userName = `${data.firstName}${data.lastName ? ' ' + data.lastName : ''}`;
    sendAccountCredentialsEmail(data.email.toLowerCase(), generatedPassword, userName)
      .then(() => {
        logger.info(`Account credentials email sent to operational user: ${data.email}`);
      })
      .catch((emailError) => {
        logger.error('Failed to send account credentials email', {
          email: data.email,
          error: emailError instanceof Error ? emailError.message : emailError,
        });
        // Don't fail user creation if email fails, just log the error
      });

    const response = new ApiResponse(201, { user: populatedUser }, 'Operational user created successfully. Credentials have been sent to their email.');
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Create operational user error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get all operational users (excluding user/academy/super_admin)
 */
export const getAllOperationalUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive as string | undefined;
    const role = req.query.role as string | undefined; // Optional role filter

    // Get all role IDs except user, academy, and super_admin
    const disallowedRoleNames = [DefaultRoles.USER, DefaultRoles.ACADEMY, DefaultRoles.SUPER_ADMIN];
    const allRoles = await RoleModel.find({
      name: { $nin: disallowedRoleNames }
    }).lean();
    
    const allowedRoleIds: Types.ObjectId[] = allRoles.map(role => new Types.ObjectId(role._id));

    // Build query - only include users with allowed roles (excluding user, academy, super_admin)
    const query: any = { 
      isDeleted: false,
      roles: { $in: allowedRoleIds }
    };

    // Search filter (by firstName, lastName, email, mobile)
    const searchConditions: any[] = [];
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      searchConditions.push(
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex }
      );
    }

    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }

    // isActive filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === '1';
    }

    // Optional role filter
    if (role) {
      const roleDoc = await RoleModel.findOne({ name: role }).lean();
      if (roleDoc && roleDoc._id) {
        const roleId = new Types.ObjectId(roleDoc._id);
        // Ensure the role is one of the allowed roles (not user, academy, or super_admin)
        const disallowedRoleNames = [DefaultRoles.USER, DefaultRoles.ACADEMY, DefaultRoles.SUPER_ADMIN];
        if (!disallowedRoleNames.includes(roleDoc.name as DefaultRoles) && allowedRoleIds.some(id => id.equals(roleId))) {
          query.roles = roleId;
        } else {
          // If role is not allowed, return empty result
          query.roles = new Types.ObjectId('000000000000000000000000');
        }
      } else {
        query.roles = new Types.ObjectId('000000000000000000000000');
      }
    }

    // Execute query
    const usersQuery = AdminUserModel.find(query)
      .select('-password')
      .populate({
        path: 'roles',
        select: 'name description',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [users, total] = await Promise.all([
      usersQuery.lean(),
      AdminUserModel.countDocuments(query),
    ]);

    // Format users
    const formattedUsers = users.map((user: any) => {
      const formatted = {
        ...user,
        id: user.id || (user._id ? user._id.toString() : null),
        roles: (user.roles || []).map((r: any) => ({
          id: r?._id?.toString() || r?.id,
          name: r?.name,
          description: r?.description,
        })),
      };
      delete formatted._id;
      return formatted;
    });

    const response = new ApiResponse(
      200,
      {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
      'Operational users retrieved successfully'
    );
    res.json(response);
  } catch (error) {
    logger.error('Get all operational users error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get operational user by ID
 */
export const getOperationalUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get all role IDs except user, academy, and super_admin
    const disallowedRoleNames = [DefaultRoles.USER, DefaultRoles.ACADEMY, DefaultRoles.SUPER_ADMIN];
    const allRoles = await RoleModel.find({
      name: { $nin: disallowedRoleNames }
    }).lean();
    
    const allowedRoleIds: Types.ObjectId[] = allRoles.map(role => new Types.ObjectId(role._id));

    // Build query
    let query: any;
    let userObjectId: Types.ObjectId | null = null;
    
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      userObjectId = new Types.ObjectId(id);
      query = AdminUserModel.findOne({
        $or: [
          { _id: userObjectId, isDeleted: false, roles: { $in: allowedRoleIds } },
          { id, isDeleted: false, roles: { $in: allowedRoleIds } }
        ]
      });
    } else {
      query = AdminUserModel.findOne({ id, isDeleted: false, roles: { $in: allowedRoleIds } });
    }

    const user = await query
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, 'Operational user not found');
    }
    
    const formattedUser = {
      ...user,
      id: user.id || (user._id ? user._id.toString() : null),
    };
    delete formattedUser._id;

    const response = new ApiResponse(200, { user: formattedUser }, 'Operational user retrieved successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get operational user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Check if current user is super admin
 */
const isSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = await AdminUserModel.findOne({ id: userId, isDeleted: false, isActive: true })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user || !user.roles) {
      return false;
    }

    const userRoles = user.roles as any[];
    return userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);
  } catch (error) {
    logger.error('Error checking super admin status:', { userId, error });
    return false;
  }
};

/**
 * Update operational user
 * Super admin can update email and password
 */
export const updateOperationalUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateOperationalUserInput = req.body;

    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const currentUserIsSuperAdmin = await isSuperAdmin(req.user.id);

    // Get all role IDs except user, academy, and super_admin
    const disallowedRoleNames = [DefaultRoles.USER, DefaultRoles.ACADEMY, DefaultRoles.SUPER_ADMIN];
    const allRoles = await RoleModel.find({
      name: { $nin: disallowedRoleNames }
    }).lean();
    
    const allowedRoleIds: Types.ObjectId[] = allRoles.map(role => new Types.ObjectId(role._id));

    // Build query
    let findQuery: any;
    let updateQuery: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      findQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
          { id, isDeleted: false, roles: { $in: allowedRoleIds } }
        ]
      };
      updateQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
          { id, isDeleted: false, roles: { $in: allowedRoleIds } }
        ]
      };
    } else {
      findQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
      updateQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
    }

    const existingUser = await AdminUserModel.findOne(findQuery);
    if (!existingUser) {
      throw new ApiError(404, 'Operational user not found');
    }

    const updateData: any = {};

    // Email and password can only be updated by super admin
    if (data.email !== undefined) {
      if (!currentUserIsSuperAdmin) {
        throw new ApiError(403, 'Only super admin can update email');
      }
      const emailExists = await AdminUserModel.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: existingUser._id },
        isDeleted: false,
      });
      if (emailExists) {
        throw new ApiError(400, t('admin.users.emailExists'));
      }
      updateData.email = data.email.toLowerCase();
    }

    // Password updates are handled separately and only by super_admin
    // Password field is removed from update schema, so this check is no longer needed here

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
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.address !== undefined) {
      if (data.address === null) {
        updateData.address = null;
      } else if (data.address && typeof data.address === 'object') {
        let mergedAddress: any;
        const addressData = data.address as Record<string, any>;
        
        if (existingUser.address) {
          const existingAddress = existingUser.address as any;
          const existingAddressObj = existingAddress.toObject ? 
            existingAddress.toObject() : 
            (typeof existingAddress === 'object' ? { ...existingAddress } : existingAddress);
          mergedAddress = { ...existingAddressObj };
          
          Object.keys(addressData).forEach((key) => {
            if (addressData[key] !== null && addressData[key] !== undefined) {
              mergedAddress[key] = addressData[key];
            }
          });
        } else {
          mergedAddress = { ...addressData };
        }
        
        if (!mergedAddress.country) {
          mergedAddress.country = 'India';
        }
        
        if (mergedAddress.line2 && mergedAddress.city && 
            mergedAddress.state && mergedAddress.country && 
            mergedAddress.pincode) {
          if (mergedAddress.line1 === undefined) {
            mergedAddress.line1 = null;
          }
          updateData.address = mergedAddress;
        } else {
          updateData.address = null;
        }
      } else {
        updateData.address = null;
      }
    }

    // Handle roles update
    if (data.roles && data.roles.length > 0) {
      const roleNames: string[] = [];
      const roleIds: Types.ObjectId[] = [];
      
      for (const input of data.roles) {
        if (Types.ObjectId.isValid(input)) {
          roleIds.push(new Types.ObjectId(input));
        } else {
          roleNames.push(input);
        }
      }
      
      let rolesQuery: any;
      if (roleNames.length > 0 && roleIds.length > 0) {
        rolesQuery = {
          $or: [
            { name: { $in: roleNames } },
            { _id: { $in: roleIds } }
          ]
        };
      } else if (roleNames.length > 0) {
        rolesQuery = { name: { $in: roleNames } };
      } else if (roleIds.length > 0) {
        rolesQuery = { _id: { $in: roleIds } };
      } else {
        throw new ApiError(400, 'Invalid roles format');
      }
      
      const roles = await RoleModel.find(rolesQuery);
      
      if (roles.length !== data.roles.length) {
        throw new ApiError(400, 'One or more roles are invalid');
      }
      updateData.roles = roles.map((role) => role._id);
    }

    const user = await AdminUserModel.findOneAndUpdate(
      updateQuery,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, 'Operational user not found');
    }

    logger.info(`Admin updated operational user: ${id}`);

    const response = new ApiResponse(200, { user }, 'Operational user updated successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update operational user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete operational user (soft delete)
 */
export const deleteOperationalUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get all role IDs except user, academy, and super_admin
    const disallowedRoleNames = [DefaultRoles.USER, DefaultRoles.ACADEMY, DefaultRoles.SUPER_ADMIN];
    const allRoles = await RoleModel.find({
      name: { $nin: disallowedRoleNames }
    }).lean();
    
    const allowedRoleIds: Types.ObjectId[] = allRoles.map(role => new Types.ObjectId(role._id));

    let deleteQuery: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      deleteQuery = {
        $or: [
          { _id: new Types.ObjectId(id), isDeleted: false, roles: { $in: allowedRoleIds } },
          { id, isDeleted: false, roles: { $in: allowedRoleIds } }
        ]
      };
    } else {
      deleteQuery = { id, isDeleted: false, roles: { $in: allowedRoleIds } };
    }

    const user = await AdminUserModel.findOneAndUpdate(
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
      throw new ApiError(404, 'Operational user not found');
    }

    const response = new ApiResponse(200, null, 'Operational user deleted successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Delete operational user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

