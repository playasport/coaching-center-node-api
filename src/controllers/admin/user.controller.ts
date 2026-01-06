import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';
import { ParticipantModel } from '../../models/participant.model';
import { BookingModel } from '../../models/booking.model';
import { BatchModel } from '../../models/batch.model';
import { hashPassword } from '../../utils/password';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { BatchStatus } from '../../enums/batchStatus.enum';
import type { CreateAdminUserInput, UpdateAdminUserInput } from '../../validations/adminUser.validation';

/**
 * Create user (admin)
 */
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

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const data: CreateAdminUserInput = req.body;
  try {

    // Check if email already exists
    const existingUserByEmail = await UserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false });
    if (existingUserByEmail) {
      throw new ApiError(400, t('admin.users.emailExists'));
    }

    // Check if mobile number already exists (only if mobile is provided)
    if (data.mobile) {
      const existingUserByMobile = await UserModel.findOne({ mobile: data.mobile, isDeleted: false });
      if (existingUserByMobile) {
        throw new ApiError(400, t('admin.users.mobileExists'));
      }
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
      // Both names and IDs provided - use $or
      rolesQuery = {
        $or: [
          { name: { $in: roleNames } },
          { _id: { $in: roleIds } }
        ]
      };
    } else if (roleNames.length > 0) {
      // Only names provided
      rolesQuery = { name: { $in: roleNames } };
    } else if (roleIds.length > 0) {
      // Only IDs provided
      rolesQuery = { _id: { $in: roleIds } };
    } else {
      // No valid inputs (shouldn't happen after validation, but handle it)
      throw new ApiError(400, t('admin.users.invalidRolesFormat'));
    }
    
    const roles = await RoleModel.find(rolesQuery);
    
    if (roles.length !== data.roles.length) {
      throw new ApiError(400, t('admin.users.invalidRoles'));
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Generate unique user ID
    const userId = uuidv4();

    // Validate address: if address is provided but incomplete, set to null
    // Mongoose schema requires line2, city, state, country, pincode
    // Note: line1 is optional (can be null)
    // Default country to "India" if not provided
    let address = null;
    if (data.address && isAddressComplete(data.address)) {
      address = {
        line1: data.address.line1 ?? null,
        ...data.address,
        country: data.address.country || 'India',
      };
    }

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
      address: address,
      isDeleted: false,
    });

    // Populate roles before returning
    const populatedUser = await UserModel.findById(user._id)
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!populatedUser) {
      logger.error('User created but not found after creation', { userId, user_id: user._id });
      throw new ApiError(500, t('admin.users.createFailed'));
    }

    logger.info(`Admin created user: ${userId} (${data.email})`);

    const response = new ApiResponse(201, { user: populatedUser }, t('admin.users.created') || 'User created successfully');
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Create user error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get all users (admin view) with filters
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const search = req.query.search as string | undefined;
    const userType = req.query.userType as string | undefined;
    const isActive = req.query.isActive as string | undefined;
    const role = req.query.role as string | undefined;

    // Build query
    const query: any = { isDeleted: false };

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

    // userType filter
    const userTypeConditions: any[] = [];
    if (userType) {
      if (userType === 'other') {
        // Filter for users where userType is null or doesn't exist
        userTypeConditions.push(
          { userType: null },
          { userType: { $exists: false } }
        );
      } else if (userType === 'student' || userType === 'guardian') {
        query.userType = userType;
      }
    }

    // Combine search and userType filters using $and if both exist
    if (searchConditions.length > 0 && userTypeConditions.length > 0) {
      query.$and = [
        { $or: searchConditions },
        { $or: userTypeConditions }
      ];
    } else if (searchConditions.length > 0) {
      query.$or = searchConditions;
    } else if (userTypeConditions.length > 0) {
      query.$or = userTypeConditions;
    }

    // isActive filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === '1';
    }

    // Role filter
    if (role) {
      // Find role by name
      const roleDoc = await RoleModel.findOne({ name: role }).lean();
      if (roleDoc && roleDoc._id) {
        // Filter users where roles array contains this role ObjectId
        query.roles = roleDoc._id;
      } else {
        // If role not found, use invalid ObjectId to return empty result
        // This ensures no users match when role doesn't exist
        query.roles = new Types.ObjectId('000000000000000000000000');
      }
    }

    // Execute query with explicit role population
    const usersQuery = UserModel.find(query)
      .select('-password')
      .populate({
        path: 'roles',
        select: 'name description',
        options: { strictPopulate: false } // Don't throw error if role doesn't exist
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [users, total] = await Promise.all([
      usersQuery.lean(),
      UserModel.countDocuments(query),
    ]);

    // Get user IDs for counting participants and bookings
    const userIds = users.map((user: any) => user._id);

    // Initialize maps for counts
    const participantCountMap = new Map<string, number>();
    const bookingCountMap = new Map<string, number>();

    // Only query if there are users
    if (userIds.length > 0) {
      // Get participant counts per user
      const participantCounts = await ParticipantModel.aggregate([
        {
          $match: {
            userId: { $in: userIds },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get booking counts per user
      const bookingCounts = await BookingModel.aggregate([
        {
          $match: {
            user: { $in: userIds },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
          },
        },
      ]);

      // Create maps for quick lookup
      participantCounts.forEach((item) => {
        participantCountMap.set(item._id.toString(), item.count);
      });
      bookingCounts.forEach((item) => {
        bookingCountMap.set(item._id.toString(), item.count);
      });
    }

    // Collect all unique role ObjectIds that need to be populated
    const roleObjectIds = new Set<string>();
    users.forEach((user: any) => {
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach((role: any) => {
          if (role) {
            // If it's an ObjectId (not populated), collect it
            if (typeof role === 'object' && !('name' in role)) {
              const roleId = role._id ? role._id.toString() : role.toString();
              if (Types.ObjectId.isValid(roleId)) {
                roleObjectIds.add(roleId);
              }
            }
          }
        });
      }
    });

    // Fetch all roles in one query if there are unpopulated ObjectIds
    const rolesMap = new Map<string, any>();
    if (roleObjectIds.size > 0) {
      const roleDocs = await RoleModel.find({
        _id: { $in: Array.from(roleObjectIds).map(id => new Types.ObjectId(id)) }
      }).select('name description').lean();
      
      roleDocs.forEach((role: any) => {
        if (role._id) {
          rolesMap.set(role._id.toString(), role);
        }
      });
    }

    // Add counts to users and ensure roles are properly formatted
    const usersWithCounts = users.map((user: any) => {
      // Ensure roles array is properly formatted
      let formattedRoles: any[] = [];
      
      if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        formattedRoles = user.roles
          .filter((role: any) => role !== null && role !== undefined)
          .map((role: any) => {
            // If role is already populated (has name property), format it
            if (role && typeof role === 'object' && ('name' in role || (role._id && role.name))) {
              return {
                _id: role._id ? role._id.toString() : (role.id || null),
                name: role.name || null,
                description: role.description || null,
              };
            }
            
            // If it's an unpopulated ObjectId, try to get it from rolesMap
            const roleId = role._id ? role._id.toString() : (role.toString ? role.toString() : null);
            if (roleId && Types.ObjectId.isValid(roleId)) {
              const populatedRole = rolesMap.get(roleId);
              if (populatedRole) {
                return {
                  _id: populatedRole._id.toString(),
                  name: populatedRole.name || null,
                  description: populatedRole.description || null,
                };
              }
            }
            
            return null;
          })
          .filter((role: any) => role !== null && role !== undefined);
      }
      
      return {
        ...user,
        roles: formattedRoles,
        participantCount: participantCountMap.get(user._id.toString()) || 0,
        bookingCount: bookingCountMap.get(user._id.toString()) || 0,
      };
    });

    // Get statistics
    const [
      totalUsers,
      totalParticipants,
      activeBookings,
      usersWithBookings,
      usersWithParticipants,
      usersWithEnrolledBatchSports,
      usersWithBookingsAndParticipants,
    ] = await Promise.all([
      // Total users
      UserModel.countDocuments({ isDeleted: false }),
      
      // Total participants (students)
      ParticipantModel.countDocuments({ is_deleted: false }),
      
      // Active bookings (is_active = true and is_deleted = false)
      BookingModel.countDocuments({ is_active: true, is_deleted: false }),
      
      // Users with bookings (enrolled batches)
      BookingModel.distinct('user', { is_deleted: false }),
      
      // Users with participants
      ParticipantModel.distinct('userId', { is_deleted: false }),
      
      // Users with enrolled batch sports (users with bookings that have sports)
      BookingModel.distinct('user', {
        is_deleted: false,
        sport: { $exists: true, $ne: null },
      }),
      
      // Users with both bookings and participants (users who have bookings AND participants)
      BookingModel.aggregate([
        {
          $match: { is_deleted: false },
        },
        {
          $lookup: {
            from: 'participants',
            let: { userId: '$user' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$userId', '$$userId'] },
                  is_deleted: false,
                },
              },
              { $limit: 1 },
            ],
            as: 'hasParticipant',
          },
        },
        {
          $match: {
            hasParticipant: { $ne: [] },
          },
        },
        {
          $group: {
            _id: '$user',
          },
        },
      ]),
    ]);

    // Convert to Sets for counting unique users
    const usersWithBookingsIds = new Set(
      usersWithBookings.map((id: any) => id.toString())
    );
    const usersWithParticipantsIds = new Set(
      usersWithParticipants.map((id: any) => id.toString())
    );
    const usersWithEnrolledBatchSportsIds = new Set(
      usersWithEnrolledBatchSports.map((id: any) => id.toString())
    );
    const usersWithBookingsAndParticipantsIds = new Set(
      usersWithBookingsAndParticipants.map((item: any) => item._id.toString())
    );

    const stats = {
      totalUsers,
      totalParticipants, // Total participants (which are students)
      activeBookings,
      userDetailsCount: {
        usersWithBookings: usersWithBookingsIds.size, // Users who have bookings (enrolled batches)
        usersWithParticipants: usersWithParticipantsIds.size, // Users who have participants
        usersWithEnrolledBatches: usersWithBookingsIds.size, // Same as usersWithBookings (enrolled batches = bookings)
        usersWithEnrolledBatchSports: usersWithEnrolledBatchSportsIds.size, // Users with bookings in sports batches
        usersWithBookingsAndParticipants: usersWithBookingsAndParticipantsIds.size, // Users with both bookings and participants
      },
    };

    const response = new ApiResponse(
      200,
      {
        users: usersWithCounts,
        stats,
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
    logger.error('Get all users error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get user by ID (admin view)
 * Supports both UUID id and MongoDB _id for backward compatibility
 * Includes: participants, bookings, enrolled batches, and active batches (latest 5 each)
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Build query - support both UUID id and MongoDB _id
    let query: any;
    let userObjectId: Types.ObjectId | null = null;
    
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      // Try MongoDB _id first (24 hex characters)
      userObjectId = new Types.ObjectId(id);
      query = UserModel.findOne({
        $or: [
          { _id: userObjectId, isDeleted: false },
          { id, isDeleted: false }
        ]
      });
    } else {
      // Try UUID id format
      query = UserModel.findOne({ id, isDeleted: false });
    }

    // Fetch user with populate - use same pattern as getAllUsers which works correctly
    const user = await query
      .select('-password')
      .populate('roles', 'name description')
      .populate('favoriteSports', 'custom_id name logo')
      .lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }
    
    // Format user data: ensure id is set properly (same as getAllUsers pattern)
    const formattedUser = {
      ...user,
      id: user.id || (user._id ? user._id.toString() : null),
    };

    // Get user ObjectId if not already obtained
    if (!userObjectId) {
      userObjectId = new Types.ObjectId((user as any)._id || formattedUser.id);
    }

    // Fetch participants (latest 5)
    const participants = await ParticipantModel.find({
      userId: userObjectId,
      is_deleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Fetch bookings (latest 5) with populated data
    const bookings = await BookingModel.find({
      user: userObjectId,
      is_deleted: false,
    })
      .populate('batch', 'name sport center status is_active scheduled duration capacity age')
      .populate('center', 'center_name email mobile_number address')
      .populate('sport', 'custom_id name logo')
      .populate('participants', 'firstName lastName dob gender contactNumber')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get unique batch IDs from bookings for enrolled batches
    const enrolledBatchIds = [...new Set(
      bookings
        .map((b: any) => {
          // Handle both populated object and ObjectId
          if (b.batch) {
            return typeof b.batch === 'object' && b.batch._id ? b.batch._id.toString() : b.batch.toString();
          }
          return null;
        })
        .filter(Boolean)
    )];
    
    // Fetch enrolled batches (latest 5 unique batches from bookings)
    const enrolledBatches = enrolledBatchIds.length > 0
      ? await BatchModel.find({
          _id: { $in: enrolledBatchIds.map((id: string) => new Types.ObjectId(id)) },
          is_deleted: false,
        })
          .populate('sport', 'custom_id name logo')
          .populate('center', 'center_name email mobile_number')
          .populate('coach', 'fullName mobileNo email')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : [];

    // Fetch active batches owned by this user (latest 5)
    const activeBatches = await BatchModel.find({
      user: userObjectId,
      is_active: true,
      is_deleted: false,
      status: BatchStatus.PUBLISHED,
    })
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Prepare response with user and additional details
    const response = new ApiResponse(
      200,
      {
        user: formattedUser,
        participants: participants || [],
        bookings: bookings || [],
        enrolledBatches: enrolledBatches || [],
        activeBatches: activeBatches || [],
      },
      t('admin.users.retrieved')
    );
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get user error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Check if current user is super admin
 */
const isSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = await UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
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
 * Update user (admin)
 * Super admin can update email and password
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateAdminUserInput = req.body;

    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Check if current user is super admin
    const currentUserIsSuperAdmin = await isSuperAdmin(req.user.id);

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

    // Email and password can only be updated by super admin
    if (data.email !== undefined) {
      if (!currentUserIsSuperAdmin) {
        throw new ApiError(403, t('admin.users.onlySuperAdminCanUpdateEmail'));
      }
      // Check if email already exists (excluding current user)
      const emailExists = await UserModel.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: existingUser._id },
        isDeleted: false,
      });
      if (emailExists) {
        throw new ApiError(400, t('admin.users.emailExists'));
      }
      updateData.email = data.email.toLowerCase();
    }

    if (data.password !== undefined) {
      if (!currentUserIsSuperAdmin) {
        throw new ApiError(403, t('admin.users.onlySuperAdminCanUpdatePassword'));
      }
      // Hash the new password
      const hashedPassword = await hashPassword(data.password);
      updateData.password = hashedPassword;
    }

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
      // Handle address update - support partial updates
      if (data.address === null) {
        // Explicitly set to null if null is provided
        updateData.address = null;
      } else if (data.address && typeof data.address === 'object') {
        // For partial updates, merge with existing address if user exists
        let mergedAddress: any;
        const addressData = data.address as Record<string, any>;
        
        if (existingUser.address) {
          // Merge with existing address - convert to plain object if needed
          const existingAddress = existingUser.address as any;
          const existingAddressObj = existingAddress.toObject ? 
            existingAddress.toObject() : 
            (typeof existingAddress === 'object' ? { ...existingAddress } : existingAddress);
          mergedAddress = { ...existingAddressObj };
          
          // Only update fields that are explicitly provided (not null/undefined)
          Object.keys(addressData).forEach((key) => {
            if (addressData[key] !== null && addressData[key] !== undefined) {
              mergedAddress[key] = addressData[key];
            }
          });
        } else {
          // No existing address, use provided address as-is
          mergedAddress = { ...addressData };
        }
        
        // Set default country to "India" if not provided
        if (!mergedAddress.country) {
          mergedAddress.country = 'India';
        }
        
        // Validate that required fields are present after merge
        // Required: line2, city, state, country, pincode
        // Note: line1 is optional (can be null)
        if (mergedAddress.line2 && mergedAddress.city && 
            mergedAddress.state && mergedAddress.country && 
            mergedAddress.pincode) {
          // Ensure line1 is set (can be null)
          if (mergedAddress.line1 === undefined) {
            mergedAddress.line1 = null;
          }
          updateData.address = mergedAddress;
        } else {
          // If required fields are missing, set to null
          updateData.address = null;
        }
      } else {
        // Invalid address format, set to null
        updateData.address = null;
      }
    }

    // Handle roles update if provided (support both role names and ObjectIds)
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
      
      // Build query for roles
      let rolesQuery: any;
      if (roleNames.length > 0 && roleIds.length > 0) {
        // Both names and IDs provided - use $or
        rolesQuery = {
          $or: [
            { name: { $in: roleNames } },
            { _id: { $in: roleIds } }
          ]
        };
      } else if (roleNames.length > 0) {
        // Only names provided
        rolesQuery = { name: { $in: roleNames } };
      } else if (roleIds.length > 0) {
        // Only IDs provided
        rolesQuery = { _id: { $in: roleIds } };
      } else {
        // No valid inputs (shouldn't happen after validation, but handle it)
        throw new ApiError(400, t('admin.users.invalidRolesFormat'));
      }
      
      const roles = await RoleModel.find(rolesQuery);
      
      if (roles.length !== data.roles.length) {
        throw new ApiError(400, t('admin.users.invalidRoles'));
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
