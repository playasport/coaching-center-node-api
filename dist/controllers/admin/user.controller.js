"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.toggleUserStatus = exports.updateUser = exports.getUser = exports.getAllUsers = exports.createUser = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const user_model_1 = require("../../models/user.model");
const role_model_1 = require("../../models/role.model");
const participant_model_1 = require("../../models/participant.model");
const booking_model_1 = require("../../models/booking.model");
const batch_model_1 = require("../../models/batch.model");
const password_1 = require("../../utils/password");
const passwordGenerator_1 = require("../../utils/passwordGenerator");
const email_service_1 = require("../../services/common/email.service");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const batchStatus_enum_1 = require("../../enums/batchStatus.enum");
const role_service_1 = require("../../services/admin/role.service");
/**
 * Create user (admin)
 */
/**
 * Check if address object has all required fields for Mongoose schema
 * Required fields: line2, city, state, country, pincode
 * Note: line1 is optional (can be null)
 */
const isAddressComplete = (address) => {
    if (!address || typeof address !== 'object') {
        return false;
    }
    return !!(address.line2 &&
        address.city &&
        address.state &&
        (address.country || 'India') && // Default to India if not provided
        address.pincode);
};
const createUser = async (req, res) => {
    const data = req.body;
    try {
        // Check if email and mobile already exist (parallel queries)
        const [existingUserByEmail, existingUserByMobile] = await Promise.all([
            user_model_1.UserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false }).lean(),
            data.mobile ? user_model_1.UserModel.findOne({ mobile: data.mobile, isDeleted: false }).lean() : Promise.resolve(null),
        ]);
        if (existingUserByEmail) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.emailExists'));
        }
        if (data.mobile && existingUserByMobile) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.mobileExists'));
        }
        // Validate and get roles (support both role names and ObjectIds)
        const roleNames = [];
        const roleIds = [];
        for (const input of data.roles) {
            if (mongoose_1.Types.ObjectId.isValid(input)) {
                roleIds.push(new mongoose_1.Types.ObjectId(input));
            }
            else {
                roleNames.push(input);
            }
        }
        // Build query for roles
        let rolesQuery;
        if (roleNames.length > 0 && roleIds.length > 0) {
            // Both names and IDs provided - use $or
            rolesQuery = {
                $or: [
                    { name: { $in: roleNames } },
                    { _id: { $in: roleIds } }
                ]
            };
        }
        else if (roleNames.length > 0) {
            // Only names provided
            rolesQuery = { name: { $in: roleNames } };
        }
        else if (roleIds.length > 0) {
            // Only IDs provided
            rolesQuery = { _id: { $in: roleIds } };
        }
        else {
            // No valid inputs (shouldn't happen after validation, but handle it)
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.invalidRolesFormat'));
        }
        const roles = await role_model_1.RoleModel.find(rolesQuery);
        if (roles.length !== data.roles.length) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.invalidRoles'));
        }
        // Generate secure random password
        const generatedPassword = (0, passwordGenerator_1.generateSecurePassword)(12);
        const hashedPassword = await (0, password_1.hashPassword)(generatedPassword);
        // Generate unique user ID
        const userId = (0, uuid_1.v4)();
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
        // Create user and populate roles in parallel
        const user = await user_model_1.UserModel.create({
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
        const populatedUser = await user_model_1.UserModel.findById(user._id)
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!populatedUser) {
            logger_1.logger.error('User created but not found after creation', { userId, user_id: user._id });
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('admin.users.createFailed'));
        }
        logger_1.logger.info(`Admin created user: ${userId} (${data.email})`);
        // Send account credentials email asynchronously (don't wait for it)
        // This prevents email sending from blocking the API response
        const userName = `${data.firstName}${data.lastName ? ' ' + data.lastName : ''}`;
        (0, email_service_1.sendAccountCredentialsEmail)(data.email.toLowerCase(), generatedPassword, userName)
            .then(() => {
            logger_1.logger.info(`Account credentials email sent to user: ${data.email}`);
        })
            .catch((emailError) => {
            logger_1.logger.error('Failed to send account credentials email', {
                email: data.email,
                error: emailError instanceof Error ? emailError.message : emailError,
            });
            // Don't fail user creation if email fails, just log the error
        });
        const response = new ApiResponse_1.ApiResponse(201, { user: populatedUser }, (0, i18n_1.t)('admin.users.created') || 'User created successfully. Credentials have been sent to their email.');
        res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Create user error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            body: req.body,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.createUser = createUser;
/**
 * Get all users (admin view) with filters
 */
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Extract filter parameters
        const search = req.query.search;
        const userType = req.query.userType;
        const isActive = req.query.isActive;
        const includeTotal = req.query.includeTotal !== 'false'; // Make total count optional (default: true)
        // Note: role filter removed - only showing users with "user" or "academy" roles
        // Get user and academy role IDs with caching (optimization)
        const { userRoleId, academyRoleId } = await (0, role_service_1.getRoleIds)();
        // Build query - only include users with "user" or "academy" roles
        const roleIds = [];
        if (userRoleId)
            roleIds.push(userRoleId);
        if (academyRoleId)
            roleIds.push(academyRoleId);
        // Build base query - start with isDeleted filter only
        // Role filter will be added conditionally based on userType
        const query = {
            isDeleted: false
        };
        // Add base role filter only if userType is not student/guardian
        // (student/guardian can have any role, so we don't restrict by role)
        let shouldApplyBaseRoleFilter = true;
        // Search filter (by firstName, lastName, email, mobile)
        const searchConditions = [];
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            searchConditions.push({ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }, { mobile: searchRegex });
        }
        // userType filter (supports: student, guardian, academy, other)
        // Logic:
        // - If userType=academy: Filter by role='academy' only (ignore userType field)
        // - Otherwise (student, guardian, other): Filter by userType field in database
        if (userType) {
            if (userType === 'academy') {
                // For academy: Filter by role='academy' only (don't check userType field)
                if (academyRoleId) {
                    // Use $in with array for consistency with base query structure
                    query.roles = { $in: [academyRoleId] }; // Only academy role users
                    shouldApplyBaseRoleFilter = false; // Don't apply base role filter - we've already set academy-only filter
                }
                else {
                    query.roles = { $in: [] }; // No results if academy role doesn't exist
                    shouldApplyBaseRoleFilter = false; // Don't apply base role filter
                }
            }
            else if (userType === 'student' || userType === 'guardian') {
                // Filter by userType field only - don't restrict by role
                // Student/guardian users can have any role
                query.userType = userType;
                shouldApplyBaseRoleFilter = false; // Don't apply role filter for student/guardian
            }
            else if (userType === 'other') {
                // For 'other': Filter for users where userType is null or doesn't exist
                // Keep base role filter (user or academy) since both can have null userType
                query.$or = query.$or || [];
                query.$or.push({ userType: null }, { userType: { $exists: false } });
            }
        }
        // Combine search filters with $and to ensure all conditions are met
        // When both userType (direct field) and search ($or) exist, MongoDB handles them as AND
        // But we need to make sure the structure is correct
        if (searchConditions.length > 0) {
            // If we already have $or (from userType 'other'), wrap it in $and
            if (query.$or && userType === 'other') {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchConditions }
                ];
                delete query.$or;
            }
            else {
                // For student/guardian/academy, just add search as $or
                // MongoDB will AND it with the userType filter
                query.$or = searchConditions;
            }
        }
        // Apply base role filter if needed (for academy, other, or no userType filter)
        if (shouldApplyBaseRoleFilter && roleIds.length > 0) {
            query.roles = { $in: roleIds }; // Only users with user or academy roles
        }
        // isActive filter
        if (isActive !== undefined) {
            query.isActive = isActive === 'true' || isActive === '1';
        }
        // Execute query without populate (we'll fetch roles manually for better performance with lean)
        const usersQuery = user_model_1.UserModel.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        // Fetch users first, then count only if needed (optimization - count can be slow with complex queries)
        const users = await usersQuery.lean();
        // Only fetch total count if requested (default: true, but can be disabled for faster responses)
        let total = users.length; // Default to current page size
        if (includeTotal) {
            try {
                // Use aggregation with $count - can be faster than countDocuments for complex queries
                const totalResult = await user_model_1.UserModel.aggregate([
                    { $match: query },
                    { $count: 'total' }
                ]).allowDiskUse(true); // Allow disk use for large collections
                total = totalResult.length > 0 ? totalResult[0].total : users.length;
            }
            catch (error) {
                // Fallback to countDocuments if aggregation fails
                logger_1.logger.warn('Aggregation count failed, falling back to countDocuments', { error });
                total = await user_model_1.UserModel.countDocuments(query);
            }
        }
        // Collect all unique role ObjectIds from users (optimized - functional approach with flatMap)
        // Start with known role IDs
        const roleObjectIds = new Set();
        if (userRoleId)
            roleObjectIds.add(userRoleId.toString());
        if (academyRoleId)
            roleObjectIds.add(academyRoleId.toString());
        // Collect any other roles that users might have using flatMap (more functional, no nested loops)
        users
            .flatMap((user) => user.roles || [])
            .filter((roleId) => roleId != null)
            .forEach((roleId) => {
            const roleIdStr = roleId._id ? roleId._id.toString() : roleId.toString();
            if (mongoose_1.Types.ObjectId.isValid(roleIdStr)) {
                roleObjectIds.add(roleIdStr);
            }
        });
        // Fetch all roles in one query and create a Map for O(1) lookups
        // This avoids N+1 query problem - instead of querying for each user's roles separately
        const rolesMap = new Map();
        if (roleObjectIds.size > 0) {
            const roleDocs = await role_model_1.RoleModel.find({
                _id: { $in: Array.from(roleObjectIds).map(id => new mongoose_1.Types.ObjectId(id)) }
            })
                .select('name')
                .lean();
            // Create Map for fast lookups (O(1) instead of O(n) array search)
            roleDocs.forEach((role) => {
                if (role._id) {
                    rolesMap.set(role._id.toString(), role);
                }
            });
        }
        // Add counts to users and ensure roles are properly formatted
        const usersWithCounts = users.map((user) => {
            // Format roles array
            let formattedRoles = [];
            if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
                formattedRoles = user.roles
                    .map((roleId) => {
                    // Extract role ID (handle both ObjectId and string)
                    const roleIdStr = roleId?._id ? roleId._id.toString() : (roleId?.toString ? roleId.toString() : String(roleId));
                    if (mongoose_1.Types.ObjectId.isValid(roleIdStr)) {
                        const populatedRole = rolesMap.get(roleIdStr);
                        if (populatedRole) {
                            return {
                                _id: populatedRole._id.toString(),
                                name: populatedRole.name || null
                            };
                        }
                    }
                    return null;
                })
                    .filter((role) => role !== null && role !== undefined);
            }
            return {
                ...user,
                roles: formattedRoles,
            };
        });
        const responseData = {
            users: usersWithCounts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
        const response = new ApiResponse_1.ApiResponse(200, responseData, (0, i18n_1.t)('admin.users.retrieved'));
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Get all users error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllUsers = getAllUsers;
/**
 * Get user by ID (admin view)
 * Supports both UUID id and MongoDB _id for backward compatibility
 * Includes: participants, bookings, enrolled batches, and active batches (latest 5 each)
 */
const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Get user and academy role IDs to filter (parallel queries)
        const [userRole, academyRole] = await Promise.all([
            role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.USER }).lean(),
            role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.ACADEMY }).lean(),
        ]);
        const userRoleId = userRole?._id ? new mongoose_1.Types.ObjectId(userRole._id) : null;
        const academyRoleId = academyRole?._id ? new mongoose_1.Types.ObjectId(academyRole._id) : null;
        const roleIds = [];
        if (userRoleId)
            roleIds.push(userRoleId);
        if (academyRoleId)
            roleIds.push(academyRoleId);
        // Build query - support both UUID id and MongoDB _id, and only users with "user" or "academy" roles
        let query;
        let userObjectId = null;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            // Try MongoDB _id first (24 hex characters)
            userObjectId = new mongoose_1.Types.ObjectId(id);
            query = user_model_1.UserModel.findOne({
                $or: [
                    { _id: userObjectId, isDeleted: false, roles: { $in: roleIds } },
                    { id, isDeleted: false, roles: { $in: roleIds } }
                ]
            });
        }
        else {
            // Try UUID id format
            query = user_model_1.UserModel.findOne({ id, isDeleted: false, roles: { $in: roleIds } });
        }
        // Fetch user with populate - use same pattern as getAllUsers which works correctly
        const user = await query
            .select('-password')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        // Format user data: ensure id is set properly (same as getAllUsers pattern)
        const formattedUser = {
            ...user,
            id: user.id || (user._id ? user._id.toString() : null),
        };
        // Get user ObjectId if not already obtained
        if (!userObjectId) {
            userObjectId = new mongoose_1.Types.ObjectId(user._id || formattedUser.id);
        }
        // Fetch participants and bookings in parallel (latest 5 each)
        const [participants, bookings] = await Promise.all([
            participant_model_1.ParticipantModel.find({
                userId: userObjectId,
                is_deleted: false,
            })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
            booking_model_1.BookingModel.find({
                user: userObjectId,
                is_deleted: false,
            })
                .populate('batch', 'name sport center status is_active scheduled duration capacity age')
                .populate('center', 'center_name email mobile_number address')
                .populate('sport', 'custom_id name logo')
                .populate('participants', 'firstName lastName dob gender contactNumber')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
        ]);
        // Get unique batch IDs from bookings for enrolled batches
        const enrolledBatchIds = [...new Set(bookings
                .map((b) => {
                // Handle both populated object and ObjectId
                if (b.batch) {
                    return typeof b.batch === 'object' && b.batch._id ? b.batch._id.toString() : b.batch.toString();
                }
                return null;
            })
                .filter(Boolean))];
        // Fetch enrolled batches and active batches in parallel (latest 5 each)
        const [enrolledBatches, activeBatches] = await Promise.all([
            enrolledBatchIds.length > 0
                ? batch_model_1.BatchModel.find({
                    _id: { $in: enrolledBatchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
                    is_deleted: false,
                })
                    .populate('sport', 'custom_id name logo')
                    .populate('center', 'center_name email mobile_number')
                    .populate('coach', 'fullName mobileNo email')
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .lean()
                : Promise.resolve([]),
            batch_model_1.BatchModel.find({
                user: userObjectId,
                is_active: true,
                is_deleted: false,
                status: batchStatus_enum_1.BatchStatus.PUBLISHED,
            })
                .populate('sport', 'custom_id name logo')
                .populate('center', 'center_name email mobile_number')
                .populate('coach', 'fullName mobileNo email')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
        ]);
        // Prepare response with user and additional details
        const response = new ApiResponse_1.ApiResponse(200, {
            user: formattedUser,
            participants: participants || [],
            bookings: bookings || [],
            enrolledBatches: enrolledBatches || [],
            activeBatches: activeBatches || [],
        }, (0, i18n_1.t)('admin.users.retrieved'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Get user error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getUser = getUser;
/**
 * Check if current user is super admin
 */
const isSuperAdmin = async (userId) => {
    try {
        const user = await user_model_1.UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user || !user.roles) {
            return false;
        }
        const userRoles = user.roles;
        return userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
    }
    catch (error) {
        logger_1.logger.error('Error checking super admin status:', { userId, error });
        return false;
    }
};
/**
 * Update user (admin)
 * Super admin can update email and password
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Check if current user is super admin
        const currentUserIsSuperAdmin = await isSuperAdmin(req.user.id);
        // Build query - support both UUID id and MongoDB _id
        let findQuery;
        let updateQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            // Try MongoDB _id first (24 hex characters)
            findQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false },
                    { id, isDeleted: false }
                ]
            };
            updateQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false },
                    { id, isDeleted: false }
                ]
            };
        }
        else {
            // Try UUID id format
            findQuery = { id, isDeleted: false };
            updateQuery = { id, isDeleted: false };
        }
        // Check if user exists
        const existingUser = await user_model_1.UserModel.findOne(findQuery);
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        // Prepare update data
        const updateData = {};
        // Email and password can only be updated by super admin
        if (data.email !== undefined) {
            if (!currentUserIsSuperAdmin) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('admin.users.onlySuperAdminCanUpdateEmail'));
            }
            // Check if email already exists (excluding current user)
            const emailExists = await user_model_1.UserModel.findOne({
                email: data.email.toLowerCase(),
                _id: { $ne: existingUser._id },
                isDeleted: false,
            });
            if (emailExists) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.emailExists'));
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
            }
            else if (data.address && typeof data.address === 'object') {
                // For partial updates, merge with existing address if user exists
                let mergedAddress;
                const addressData = data.address;
                if (existingUser.address) {
                    // Merge with existing address - convert to plain object if needed
                    const existingAddress = existingUser.address;
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
                }
                else {
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
                }
                else {
                    // If required fields are missing, set to null
                    updateData.address = null;
                }
            }
            else {
                // Invalid address format, set to null
                updateData.address = null;
            }
        }
        // Handle roles update if provided (support both role names and ObjectIds)
        if (data.roles && data.roles.length > 0) {
            const roleNames = [];
            const roleIds = [];
            for (const input of data.roles) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            // Build query for roles
            let rolesQuery;
            if (roleNames.length > 0 && roleIds.length > 0) {
                // Both names and IDs provided - use $or
                rolesQuery = {
                    $or: [
                        { name: { $in: roleNames } },
                        { _id: { $in: roleIds } }
                    ]
                };
            }
            else if (roleNames.length > 0) {
                // Only names provided
                rolesQuery = { name: { $in: roleNames } };
            }
            else if (roleIds.length > 0) {
                // Only IDs provided
                rolesQuery = { _id: { $in: roleIds } };
            }
            else {
                // No valid inputs (shouldn't happen after validation, but handle it)
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.invalidRolesFormat'));
            }
            const roles = await role_model_1.RoleModel.find(rolesQuery);
            if (roles.length !== data.roles.length) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.users.invalidRoles'));
            }
            updateData.roles = roles.map((role) => role._id);
        }
        // Update user
        const user = await user_model_1.UserModel.findOneAndUpdate(updateQuery, { $set: updateData }, { new: true, runValidators: true })
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        logger_1.logger.info(`Admin updated user: ${id}`);
        const response = new ApiResponse_1.ApiResponse(200, { user }, (0, i18n_1.t)('admin.users.updated') || 'User updated successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Update user error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateUser = updateUser;
/**
 * Toggle user status (admin)
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        // Build query - support both UUID id and MongoDB _id
        let findQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            // Try MongoDB _id first (24 hex characters)
            findQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false },
                    { id, isDeleted: false }
                ]
            };
        }
        else {
            // Try UUID id format
            findQuery = { id, isDeleted: false };
        }
        // Find user first to get current status
        const existingUser = await user_model_1.UserModel.findOne(findQuery).select('isActive');
        if (!existingUser) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        // Toggle status
        const newStatus = !existingUser.isActive;
        // Update user status
        const user = await user_model_1.UserModel.findOneAndUpdate(findQuery, { $set: { isActive: newStatus } }, { new: true, runValidators: true })
            .select('-password')
            .populate('roles', 'name description')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        logger_1.logger.info(`Admin toggled user status: ${id} to ${newStatus ? 'active' : 'inactive'}`);
        const response = new ApiResponse_1.ApiResponse(200, { user }, newStatus ? (0, i18n_1.t)('admin.users.statusActivated') : (0, i18n_1.t)('admin.users.statusDeactivated'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Toggle user status error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.toggleUserStatus = toggleUserStatus;
/**
 * Delete user (admin - soft delete)
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Build query - support both UUID id and MongoDB _id
        let deleteQuery;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            // Try MongoDB _id first (24 hex characters)
            deleteQuery = {
                $or: [
                    { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false },
                    { id, isDeleted: false }
                ]
            };
        }
        else {
            // Try UUID id format
            deleteQuery = { id, isDeleted: false };
        }
        const user = await user_model_1.UserModel.findOneAndUpdate(deleteQuery, {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        }, { new: true });
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('admin.users.deleted'));
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.controller.js.map