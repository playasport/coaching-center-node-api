"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCoachingCentersSimple = exports.createCoachForCoachingCenter = exports.getCoachesListByCoachingCenterId = exports.getEmployeesByCoachingCenterId = exports.updateApprovalStatus = exports.getCoachingCenterStats = exports.updateCoachingCenterAddedBy = exports.updateCoachingCenterByAdmin = exports.createCoachingCenterByAdmin = exports.getCoachingCenterByIdForAdmin = exports.getCoachingCentersByUserId = exports.getAllCoachingCenters = exports.getDateRangeForKey = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const mongoose_1 = require("mongoose");
const commonService = __importStar(require("../common/coachingCenterCommon.service"));
const sport_model_1 = require("../../models/sport.model");
const user_model_1 = require("../../models/user.model");
const adminUser_model_1 = require("../../models/adminUser.model");
const role_model_1 = require("../../models/role.model");
const password_1 = require("../../utils/password");
const uuid_1 = require("uuid");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const adminApprove_enum_1 = require("../../enums/adminApprove.enum");
const employee_model_1 = require("../../models/employee.model");
const env_1 = require("../../config/env");
const mediaMoveQueue_1 = require("../../queue/mediaMoveQueue");
const coachingCenterCache_1 = require("../../utils/coachingCenterCache");
/**
 * Helper to get center ObjectId from either custom ID (UUID) or MongoDB ObjectId
 */
const getCenterObjectId = async (centerId) => {
    try {
        // If it's a valid ObjectId, use it directly
        if (mongoose_1.Types.ObjectId.isValid(centerId) && centerId.length === 24) {
            const center = await coachingCenter_model_1.CoachingCenterModel.findById(centerId).select('_id').lean();
            if (center) {
                return center._id;
            }
        }
        // Otherwise, try to find by custom ID (UUID)
        const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ id: centerId, is_deleted: false })
            .select('_id')
            .lean();
        return center ? center._id : null;
    }
    catch (error) {
        logger_1.logger.error('Failed to get center ObjectId:', error);
        return null;
    }
};
/**
 * Get start and end UTC dates for a date range key.
 * All boundaries are in UTC (start of day 00:00:00.000, end of day 23:59:59.999).
 * this_week = Monday 00:00 to Sunday 23:59:59 of current week (ISO week).
 * this_month = 1st 00:00 to last day 23:59:59 of current month.
 */
const getDateRangeForKey = (key) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    const setStartOfDay = (d) => {
        d.setUTCHours(0, 0, 0, 0);
    };
    const setEndOfDay = (d) => {
        d.setUTCHours(23, 59, 59, 999);
    };
    switch (key) {
        case 'today': {
            setStartOfDay(start);
            setEndOfDay(end);
            return { start, end };
        }
        case 'yesterday': {
            start.setUTCDate(start.getUTCDate() - 1);
            end.setUTCDate(end.getUTCDate() - 1);
            setStartOfDay(start);
            setEndOfDay(end);
            return { start, end };
        }
        case 'this_week': {
            const day = start.getUTCDay();
            const daysToMonday = day === 0 ? 6 : day - 1;
            start.setUTCDate(start.getUTCDate() - daysToMonday);
            setStartOfDay(start);
            end.setTime(start.getTime());
            end.setUTCDate(end.getUTCDate() + 6);
            setEndOfDay(end);
            return { start, end };
        }
        case 'this_month': {
            start.setUTCDate(1);
            setStartOfDay(start);
            end.setUTCMonth(end.getUTCMonth() + 1, 0);
            setEndOfDay(end);
            return { start, end };
        }
        case 'last_7_days': {
            end.setUTCHours(23, 59, 59, 999);
            start.setUTCDate(start.getUTCDate() - 6);
            setStartOfDay(start);
            return { start, end };
        }
        case 'last_30_days': {
            end.setUTCHours(23, 59, 59, 999);
            start.setUTCDate(start.getUTCDate() - 29);
            setStartOfDay(start);
            return { start, end };
        }
        default: {
            setStartOfDay(start);
            setEndOfDay(end);
            return { start, end };
        }
    }
};
exports.getDateRangeForKey = getDateRangeForKey;
/**
 * Get all coaching centers for admin view with filters
 */
const getAllCoachingCenters = async (page = 1, limit = 10, filters = {}, currentUserId, currentUserRole) => {
    try {
        const skip = (page - 1) * limit;
        const query = { is_deleted: false };
        // If user is an agent, only show centers added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                query.addedBy = adminUser._id;
                logger_1.logger.debug('Filtering coaching centers for agent', {
                    agentId: currentUserId,
                    agentObjectId: adminUser._id.toString(),
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found', { agentId: currentUserId });
            }
        }
        // Apply filters
        if (filters.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(filters.userId);
            if (userObjectId) {
                query.user = userObjectId;
            }
        }
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.isActive !== undefined) {
            query.is_active = filters.isActive;
        }
        // Filter by approval status using the enum field
        if (filters.approvalStatus) {
            query.approval_status = filters.approvalStatus;
        }
        else if (filters.isApproved !== undefined) {
            // Backward compatibility: convert isApproved boolean to approval_status
            query.approval_status = filters.isApproved ? adminApprove_enum_1.AdminApproveStatus.APPROVE : { $in: [adminApprove_enum_1.AdminApproveStatus.REJECT, adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL] };
        }
        if (filters.sportId) {
            query.sports = new mongoose_1.Types.ObjectId(filters.sportId);
        }
        // Filter by added_by (admin/agent who added the center)
        if (filters.addedById && filters.addedById.trim()) {
            const addedByAdmin = await adminUser_model_1.AdminUserModel.findOne({ id: filters.addedById.trim(), isDeleted: false })
                .select('_id')
                .lean();
            if (addedByAdmin && addedByAdmin._id) {
                query.addedBy = addedByAdmin._id;
            }
        }
        if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            query.$or = [
                { center_name: searchRegex },
                { mobile_number: searchRegex },
                { email: searchRegex }
            ];
        }
        if (filters.onlyForFemale === true) {
            query.allowed_genders = ['female'];
        }
        if (filters.allowingDisabled === true) {
            query.allowed_disabled = true;
        }
        if (filters.onlyForDisabled === true) {
            query.is_only_for_disabled = true;
        }
        // Filter by date range (createdAt)
        if (filters.dateRange) {
            const validKeys = [
                'today',
                'yesterday',
                'this_week',
                'this_month',
                'last_7_days',
                'last_30_days',
            ];
            if (validKeys.includes(filters.dateRange)) {
                const { start, end } = (0, exports.getDateRangeForKey)(filters.dateRange);
                query.createdAt = { $gte: start, $lte: end };
            }
        }
        // Handle sorting
        const sortField = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        const [coachingCenters, total] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.find(query)
                .select('_id id center_name email mobile_number logo status is_active approval_status reject_reason user addedBy sports location createdAt updatedAt')
                .populate({
                path: 'user',
                select: 'id firstName lastName email mobile isDeleted',
                // Don't use match here - it can exclude parent documents
                // Instead, we'll filter deleted users in the transformation
                options: { lean: true },
            })
                .populate({
                path: 'addedBy',
                select: 'id firstName lastName email',
                options: { lean: true },
            })
                .populate('sports', 'id name')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            coachingCenter_model_1.CoachingCenterModel.countDocuments(query),
        ]);
        // Transform to simplified list format
        const transformedCenters = coachingCenters.map((center) => ({
            _id: center._id?.toString() || '',
            id: center.id,
            center_name: center.center_name,
            email: center.email,
            mobile_number: center.mobile_number,
            logo: center.logo || null,
            status: center.status,
            is_active: center.is_active,
            approval_status: center.approval_status || 'approved',
            reject_reason: center.reject_reason || null,
            user: center.user && !center.user.isDeleted ? {
                id: center.user.id || center.user._id?.toString() || '',
                firstName: center.user.firstName || '',
                lastName: center.user.lastName || '',
                email: center.user.email || '',
                mobile: center.user.mobile || '',
            } : {
                id: '',
                firstName: '',
                lastName: '',
                email: '',
                mobile: '',
            },
            added_by: center.addedBy
                ? `${center.addedBy.firstName || ''} ${center.addedBy.lastName || ''}`.trim() || center.addedBy.email || null
                : null,
            sports: (center.sports || []).map((sport) => ({
                id: sport.id || sport._id?.toString() || '',
                name: sport.name || '',
            })),
            location: center.location ? {
                latitude: center.location.latitude,
                longitude: center.location.longitude,
                address: {
                    line1: center.location.address?.line1 || null,
                    line2: center.location.address?.line2 || '',
                    city: center.location.address?.city || '',
                    state: center.location.address?.state || '',
                    country: center.location.address?.country || null,
                    pincode: center.location.address?.pincode || '',
                },
            } : {
                latitude: 0,
                longitude: 0,
                address: {
                    line1: null,
                    line2: '',
                    city: '',
                    state: '',
                    country: null,
                    pincode: '',
                },
            },
            createdAt: center.createdAt,
            updatedAt: center.updatedAt,
        }));
        return {
            coachingCenters: transformedCenters,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to fetch all coaching centers:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllCoachingCenters = getAllCoachingCenters;
/**
 * Get coaching centers by academy owner ID for admin
 */
const getCoachingCentersByUserId = async (userId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', currentUserId, currentUserRole) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId)
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('auth.user.notFound'));
        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const query = { user: userObjectId, is_deleted: false };
        // If current user is an agent, only show centers added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                query.addedBy = adminUser._id;
                logger_1.logger.debug('Filtering coaching centers by userId for agent', {
                    agentId: currentUserId,
                    agentObjectId: adminUser._id.toString(),
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found', { agentId: currentUserId });
            }
        }
        const [coachingCenters, total] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.find(query)
                .populate({
                path: 'user',
                select: 'firstName lastName email mobile isDeleted',
                // Don't use match here - it can exclude parent documents
                // Instead, we'll filter deleted users in the transformation if needed
                options: { lean: true },
            })
                .populate('sports', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            coachingCenter_model_1.CoachingCenterModel.countDocuments({ user: userObjectId, is_deleted: false }),
        ]);
        // Filter deleted media from each coaching center
        const filteredCenters = coachingCenters.map((center) => {
            // Filter deleted documents
            if (center.documents && Array.isArray(center.documents)) {
                center.documents = center.documents.filter((doc) => !doc.is_deleted);
            }
            // Filter deleted images and videos from sport_details
            if (center.sport_details && Array.isArray(center.sport_details)) {
                center.sport_details = center.sport_details.map((sportDetail) => {
                    const filteredDetail = { ...sportDetail };
                    if (sportDetail.images && Array.isArray(sportDetail.images)) {
                        filteredDetail.images = sportDetail.images.filter((img) => !img.is_deleted);
                    }
                    if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                        filteredDetail.videos = sportDetail.videos.filter((vid) => !vid.is_deleted);
                    }
                    return filteredDetail;
                });
            }
            return center;
        });
        return {
            coachingCenters: filteredCenters,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to fetch coaching centers by user ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCoachingCentersByUserId = getCoachingCentersByUserId;
/**
 * Get coaching center by ID for admin with agent filtering
 * @param centerId - Coaching center ID
 * @param currentUserId - Current admin user ID (for agent filtering)
 * @param currentUserRole - Current admin user role (for agent filtering)
 */
const getCoachingCenterByIdForAdmin = async (centerId, currentUserId, currentUserRole) => {
    try {
        const centerObjectId = await getCenterObjectId(centerId);
        if (!centerObjectId) {
            return null;
        }
        const query = {
            _id: centerObjectId,
            is_deleted: false,
        };
        // If user is an agent, only show centers added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                query.addedBy = adminUser._id;
                logger_1.logger.debug('Filtering coaching center by ID for agent', {
                    agentId: currentUserId,
                    agentObjectId: adminUser._id.toString(),
                    centerId,
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found for center view', { agentId: currentUserId, centerId });
                // Return null if agent not found - they shouldn't see this center
                return null;
            }
        }
        // First check if center exists and matches agent filter (if applicable)
        const centerExists = await coachingCenter_model_1.CoachingCenterModel.findOne(query).select('_id').lean();
        if (!centerExists) {
            // Center doesn't exist or doesn't match agent filter
            return null;
        }
        // If center exists and passes filter, get full details using common service
        const result = await commonService.getCoachingCenterById(centerId);
        if (!result)
            return null;
        // Populate added_by (admin/agent who created this center) with name, email, phone
        if (result.addedBy) {
            const adminUser = await adminUser_model_1.AdminUserModel.findById(result.addedBy)
                .select('id firstName lastName email mobile')
                .lean();
            result.added_by = adminUser
                ? {
                    id: adminUser.id || adminUser._id?.toString() || '',
                    name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || undefined,
                    email: adminUser.email || '',
                    phone: adminUser.mobile || '',
                }
                : null;
        }
        else {
            result.added_by = null;
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to fetch coaching center by ID:', {
            centerId,
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCoachingCenterByIdForAdmin = getCoachingCenterByIdForAdmin;
/**
 * Create coaching center by admin on behalf of a user
 * @param data - Coaching center data
 * @param adminUserId - ID of the admin user creating this center (optional)
 */
const createCoachingCenterByAdmin = async (data, adminUserId) => {
    try {
        // 1. Handle Academy User creation/lookup
        let userObjectId;
        if (data.owner_id) {
            // If owner_id is provided, use it directly
            const ownerObjectId = await (0, userCache_1.getUserObjectId)(data.owner_id);
            if (!ownerObjectId) {
                throw new ApiError_1.ApiError(404, 'Academy owner user not found');
            }
            // Verify the user exists and is not deleted
            const ownerUser = await user_model_1.UserModel.findOne({ _id: ownerObjectId, isDeleted: false });
            if (!ownerUser) {
                throw new ApiError_1.ApiError(404, 'Academy owner user not found or has been deleted');
            }
            userObjectId = ownerObjectId;
        }
        else {
            // Use academy_owner details to create or find user
            const { academy_owner } = data;
            if (!academy_owner) {
                throw new ApiError_1.ApiError(400, 'Either owner_id or academy_owner must be provided');
            }
            const academyRole = await role_model_1.RoleModel.findOne({ name: role_model_1.DefaultRoles.ACADEMY });
            if (!academyRole)
                throw new ApiError_1.ApiError(500, 'Academy role not found in system');
            // Check if user already exists with this email or mobile
            let user = await user_model_1.UserModel.findOne({
                $or: [
                    { email: academy_owner.email.toLowerCase() },
                    { mobile: academy_owner.mobile }
                ],
                isDeleted: false
            });
            if (!user) {
                // Create new Academy user if not exists
                const defaultPassword = 'Academy@123'; // Default password for admin-created academy
                const hashedPassword = await (0, password_1.hashPassword)(defaultPassword);
                user = await user_model_1.UserModel.create({
                    id: (0, uuid_1.v4)(),
                    email: academy_owner.email.toLowerCase(),
                    mobile: academy_owner.mobile,
                    firstName: academy_owner.firstName,
                    lastName: academy_owner.lastName ?? null,
                    password: hashedPassword,
                    roles: [academyRole._id],
                    academyDetails: {
                        name: data.center_name, // Set academy name from coaching center name
                    },
                    isActive: true,
                    isDeleted: false,
                });
            }
            else {
                // If user exists, update academyDetails if not already set
                // Note: We don't overwrite existing academyDetails.name as user might have multiple centers
                // Only set if it's null/undefined
                if (!user.academyDetails || !user.academyDetails.name) {
                    const academyName = data.center_name || 'Academy';
                    user.academyDetails = {
                        name: academyName,
                    };
                    await user.save();
                    logger_1.logger.debug('Updated academyDetails for existing user', {
                        userId: user.id,
                        academyName: academyName,
                    });
                }
            }
            userObjectId = user._id;
        }
        // 2. Validate sports
        const sportIds = data.sports ? data.sports.map(id => new mongoose_1.Types.ObjectId(id)) : [];
        if (sportIds.length > 0) {
            const sportsCount = await sport_model_1.SportModel.countDocuments({ _id: { $in: sportIds } });
            if (sportsCount !== (data.sports?.length || 0))
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.sports.invalid'));
        }
        // 3. Resolve facilities
        const facilityIds = data.facility ? await commonService.resolveFacilities(data.facility) : [];
        // 4. Get admin user ObjectId if provided (for addedBy field) and check if agent
        // Note: addedBy references AdminUser model, so we need AdminUser ObjectId
        let addedByObjectId = null;
        let approvalStatus = adminApprove_enum_1.AdminApproveStatus.APPROVE;
        if (adminUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: adminUserId, isDeleted: false })
                .select('_id roles')
                .populate('roles', 'name')
                .lean();
            if (adminUser && adminUser._id) {
                addedByObjectId = adminUser._id;
                // Check if admin user is an agent - if so, set approval_status to pending_approval
                if (adminUser.roles) {
                    const userRoles = adminUser.roles;
                    const isAgent = userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.AGENT);
                    if (isAgent) {
                        approvalStatus = adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL; // Agent-created academies need approval
                    }
                }
                logger_1.logger.debug('Setting addedBy for coaching center', {
                    adminUserId,
                    adminUserObjectId: addedByObjectId.toString(),
                    approvalStatus,
                });
            }
            else {
                logger_1.logger.warn('AdminUser not found when creating coaching center', { adminUserId });
            }
        }
        // 5. Prepare data
        const sanitizedData = { ...data };
        const coachingCenterData = {
            ...sanitizedData,
            user: userObjectId,
            addedBy: addedByObjectId,
            approval_status: approvalStatus,
            sports: sportIds,
            facility: facilityIds,
            sport_details: (sanitizedData.sport_details || []).map(sd => ({
                ...sd,
                sport_id: new mongoose_1.Types.ObjectId(sd.sport_id)
            }))
        };
        // Remove academy_owner and owner_id from coachingCenterData as they're not fields in the model
        delete coachingCenterData.academy_owner;
        delete coachingCenterData.owner_id;
        delete coachingCenterData.description;
        // 6. Save
        const coachingCenter = new coachingCenter_model_1.CoachingCenterModel(coachingCenterData);
        await coachingCenter.save();
        // 7. Update user's academyDetails with coaching center name after center is created
        // This ensures academyDetails is set even if it wasn't set during user creation
        try {
            const user = await user_model_1.UserModel.findById(userObjectId);
            if (user) {
                // Update academyDetails with center name if not already set
                if (!user.academyDetails || !user.academyDetails.name) {
                    const academyName = data.center_name || 'Academy';
                    user.academyDetails = {
                        name: academyName,
                    };
                    await user.save();
                    logger_1.logger.debug('Updated academyDetails after coaching center creation', {
                        userId: user.id,
                        centerId: coachingCenter.id,
                        academyName: academyName,
                    });
                }
            }
        }
        catch (updateError) {
            // Non-blocking: Log error but don't fail center creation
            logger_1.logger.warn('Failed to update user academyDetails after center creation (non-blocking)', {
                error: updateError instanceof Error ? updateError.message : updateError,
                userId: userObjectId.toString(),
                centerId: coachingCenter.id,
            });
        }
        // 8. Handle media move if published (async - non-blocking)
        if (data.status === 'published') {
            try {
                // Convert to plain object for media processing
                const coachingCenterObj = coachingCenter.toObject({ flattenObjectIds: false });
                const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj);
                // Enqueue media move as background job (non-blocking)
                if (fileUrls.length > 0) {
                    (0, mediaMoveQueue_1.enqueueMediaMove)({
                        coachingCenterId: coachingCenter._id.toString(),
                        fileUrls,
                        timestamp: Date.now(),
                    }).catch((error) => {
                        logger_1.logger.error('Failed to enqueue media move job (non-blocking)', {
                            coachingCenterId: coachingCenter._id.toString(),
                            fileCount: fileUrls.length,
                            error: error instanceof Error ? error.message : error,
                        });
                    });
                }
                // Enqueue thumbnail generation (already async)
                commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj).catch((error) => {
                    logger_1.logger.error('Failed to enqueue thumbnail generation (non-blocking)', {
                        coachingCenterId: coachingCenter._id.toString(),
                        error: error instanceof Error ? error.message : error,
                    });
                });
            }
            catch (mediaError) {
                logger_1.logger.error('Failed to prepare media move job:', {
                    error: mediaError instanceof Error ? mediaError.message : mediaError,
                    stack: mediaError instanceof Error ? mediaError.stack : undefined,
                    coachingCenterId: coachingCenter._id.toString()
                });
                // Don't fail the entire creation if media move preparation fails
            }
        }
        // 8. Send notification to admin and super_admin if created by an agent (async - non-blocking)
        if (adminUserId && addedByObjectId) {
            // Fire and forget - don't await, process in background
            (async () => {
                try {
                    const adminUser = await user_model_1.UserModel.findOne({ _id: addedByObjectId })
                        .select('roles')
                        .populate('roles', 'name')
                        .lean();
                    if (adminUser && adminUser.roles) {
                        const userRoles = adminUser.roles;
                        const isAgent = userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.AGENT);
                        if (isAgent) {
                            const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
                            const centerName = coachingCenter.center_name || 'Unnamed Academy';
                            const creationDate = new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                            // Use createAndSendNotification for role-based notifications (fire-and-forget)
                            const notificationInput = {
                                recipientType: 'role',
                                roles: [role_model_1.DefaultRoles.ADMIN, role_model_1.DefaultRoles.SUPER_ADMIN],
                                title: 'New Academy Created by Agent',
                                body: `A new academy "${centerName}" has been created by an agent and requires approval.`,
                                channels: ['push'],
                                priority: 'medium',
                                data: {
                                    type: 'coaching_center_created_by_agent',
                                    coachingCenterId: coachingCenter.id,
                                    centerName: centerName,
                                    agentId: adminUserId,
                                    approvalStatus: approvalStatus,
                                    creationDate,
                                },
                                metadata: {
                                    source: 'admin_coaching_center_creation',
                                    requiresApproval: true,
                                },
                            };
                            createAndSendNotification(notificationInput).catch((error) => {
                                logger_1.logger.error('Failed to create notification for agent-created coaching center (non-blocking)', {
                                    error: error instanceof Error ? error.message : error,
                                    coachingCenterId: coachingCenter._id.toString()
                                });
                            });
                        }
                    }
                }
                catch (notificationError) {
                    logger_1.logger.error('Failed to send admin notification for agent-created coaching center (non-blocking)', {
                        notificationError: notificationError instanceof Error ? notificationError.message : notificationError,
                        coachingCenterId: coachingCenter._id.toString()
                    });
                    // Don't throw error - notification failure shouldn't break creation
                }
            })().catch((error) => {
                logger_1.logger.error('Unexpected error in notification background task', {
                    error: error instanceof Error ? error.message : error,
                    coachingCenterId: coachingCenter._id.toString()
                });
            });
        }
        const result = await commonService.getCoachingCenterById(coachingCenter._id.toString());
        // Invalidate cache after creating a new coaching center (non-blocking)
        (0, coachingCenterCache_1.invalidateCoachingCentersListCache)().catch((cacheError) => {
            logger_1.logger.warn('Failed to invalidate coaching centers list cache after create (non-blocking)', {
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        });
        return result;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to create coaching center:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            data: {
                center_name: data.center_name,
                email: data.email,
                academy_owner_email: data.academy_owner?.email
            }
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.create.failed'));
    }
};
exports.createCoachingCenterByAdmin = createCoachingCenterByAdmin;
/**
 * Update coaching center by admin
 */
const updateCoachingCenterByAdmin = async (id, data) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const existingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!existingCenter || existingCenter.is_deleted)
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        const { bank_information, ...sanitizedData } = data;
        const updates = { ...sanitizedData };
        // If userId is provided, update ownership (admin only privilege)
        if (data.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(data.userId);
            if (!userObjectId)
                throw new ApiError_1.ApiError(404, 'User not found');
            updates.user = userObjectId;
            delete updates.userId;
        }
        // Resolve sports if provided
        if (data.sports) {
            updates.sports = data.sports.map((sid) => new mongoose_1.Types.ObjectId(sid));
        }
        // Resolve facilities if provided
        if (data.facility) {
            updates.facility = await commonService.resolveFacilities(data.facility);
        }
        const updatedCenter = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: true }).lean();
        // Handle media file movement and thumbnail generation
        // If status changed to published OR center is already published (checking for new temp files)
        const isNowPublished = data.status === 'published' && existingCenter.status !== 'published';
        const wasAlreadyPublished = existingCenter.status === 'published';
        if (isNowPublished || wasAlreadyPublished) {
            // If status just changed to published, validate first
            if (isNowPublished) {
                commonService.validatePublishStatus({ ...existingCenter.toObject(), ...updates }, true);
            }
            // Move temp files to permanent (async - non-blocking)
            // Handles both new status and new media in existing published center
            try {
                const coachingCenterObj = updatedCenter;
                const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj);
                // Enqueue media move as background job (non-blocking)
                if (fileUrls.length > 0) {
                    (0, mediaMoveQueue_1.enqueueMediaMove)({
                        coachingCenterId: id,
                        fileUrls,
                        timestamp: Date.now(),
                    }).catch((error) => {
                        logger_1.logger.error('Failed to enqueue media move job during update (non-blocking)', {
                            coachingCenterId: id,
                            fileCount: fileUrls.length,
                            error: error instanceof Error ? error.message : error,
                        });
                    });
                }
                // Enqueue thumbnail generation (already async)
                commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj).catch((error) => {
                    logger_1.logger.error('Failed to enqueue thumbnail generation during update (non-blocking)', {
                        coachingCenterId: id,
                        error: error instanceof Error ? error.message : error,
                    });
                });
            }
            catch (mediaError) {
                logger_1.logger.error('Failed to prepare media move job during update:', {
                    error: mediaError instanceof Error ? mediaError.message : mediaError,
                    stack: mediaError instanceof Error ? mediaError.stack : undefined,
                    coachingCenterId: id
                });
                // Do not re-throw, allow update to succeed even if media movement preparation fails
            }
        }
        const result = await commonService.getCoachingCenterById(id);
        // Invalidate cache after updating a coaching center (non-blocking)
        // Only invalidate if center_name or is_deleted changed (affects list)
        if (data.center_name !== undefined || data.is_deleted !== undefined) {
            (0, coachingCenterCache_1.invalidateCoachingCentersListCache)().catch((cacheError) => {
                logger_1.logger.warn('Failed to invalidate coaching centers list cache after update (non-blocking)', {
                    error: cacheError instanceof Error ? cacheError.message : cacheError,
                });
            });
        }
        return result;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update coaching center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.update.failed'));
    }
};
exports.updateCoachingCenterByAdmin = updateCoachingCenterByAdmin;
/**
 * Update only the addedBy (agent/admin) for a coaching center. Uses same access rules as get (agents only their centers).
 */
const updateCoachingCenterAddedBy = async (centerId, addedById, currentUserId, currentUserRole) => {
    try {
        const centerObjectId = await getCenterObjectId(centerId);
        if (!centerObjectId) {
            return null;
        }
        const query = {
            _id: centerObjectId,
            is_deleted: false,
        };
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                query.addedBy = adminUser._id;
            }
            else {
                return null;
            }
        }
        let addedByObjectId = null;
        if (addedById && addedById.trim()) {
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: addedById.trim(), isDeleted: false })
                .select('_id')
                .lean();
            if (!adminUser || !adminUser._id) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.userNotFound') || 'Admin user not found');
            }
            addedByObjectId = adminUser._id;
        }
        const updated = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, { $set: { addedBy: addedByObjectId } }, { new: true }).lean();
        if (!updated) {
            return null;
        }
        (0, coachingCenterCache_1.invalidateCoachingCentersListCache)().catch(() => { });
        return (0, exports.getCoachingCenterByIdForAdmin)(centerId, currentUserId, currentUserRole);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update coaching center addedBy:', {
            centerId,
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.update.failed'));
    }
};
exports.updateCoachingCenterAddedBy = updateCoachingCenterAddedBy;
/**
 * Get coaching center statistics for admin dashboard
 */
const getCoachingCenterStats = async (params, currentUserId, currentUserRole) => {
    try {
        const dateQuery = {
            is_deleted: false,
        };
        // If user is an agent, only show centers added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            const currentUserObjectId = await (0, userCache_1.getUserObjectId)(currentUserId);
            if (currentUserObjectId) {
                dateQuery.addedBy = currentUserObjectId;
            }
        }
        // Apply date filters
        if (params?.startDate || params?.endDate) {
            dateQuery.createdAt = {};
            if (params.startDate) {
                dateQuery.createdAt.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                const endDate = new Date(params.endDate);
                endDate.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = endDate;
            }
        }
        // Apply userId filter
        if (params?.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(params.userId);
            if (userObjectId) {
                dateQuery.user = userObjectId;
            }
        }
        // Apply status filter
        if (params?.status) {
            dateQuery.status = params.status;
        }
        // Apply isActive filter
        if (params?.isActive !== undefined) {
            dateQuery.is_active = params.isActive;
        }
        // Apply approval status filter
        if (params?.approvalStatus) {
            dateQuery.approval_status = params.approvalStatus;
        }
        else if (params?.isApproved !== undefined) {
            // Backward compatibility: convert isApproved boolean to approval_status
            dateQuery.approval_status = params.isApproved ? adminApprove_enum_1.AdminApproveStatus.APPROVE : { $in: [adminApprove_enum_1.AdminApproveStatus.REJECT, adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL] };
        }
        // Apply sportId filter
        if (params?.sportId) {
            dateQuery.sports = new mongoose_1.Types.ObjectId(params.sportId);
        }
        // Apply search filter
        if (params?.search) {
            const searchRegex = new RegExp(params.search, 'i');
            dateQuery.$or = [
                { center_name: searchRegex },
                { mobile_number: searchRegex },
                { email: searchRegex }
            ];
        }
        // Get total count, status counts, active counts, and approval status counts in parallel
        const [total, statusCounts, activeCounts, approvalStatusCounts] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.countDocuments(dateQuery),
            coachingCenter_model_1.CoachingCenterModel.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
            coachingCenter_model_1.CoachingCenterModel.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: '$is_active',
                        count: { $sum: 1 },
                    },
                },
            ]),
            coachingCenter_model_1.CoachingCenterModel.aggregate([
                { $match: dateQuery },
                {
                    $group: {
                        _id: '$approval_status',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const byStatus = {};
        statusCounts.forEach((item) => {
            byStatus[item._id] = item.count;
        });
        const byActiveStatus = {
            active: activeCounts.find((item) => item._id === true)?.count || 0,
            inactive: activeCounts.find((item) => item._id === false)?.count || 0,
        };
        const byApprovalStatus = {
            approved: approvalStatusCounts.find((item) => item._id === adminApprove_enum_1.AdminApproveStatus.APPROVE)?.count || 0,
            rejected: approvalStatusCounts.find((item) => item._id === adminApprove_enum_1.AdminApproveStatus.REJECT)?.count || 0,
            pending_approval: approvalStatusCounts.find((item) => item._id === adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL)?.count || 0,
        };
        // Get counts by sport (unwind sports array)
        const sportCounts = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            { $match: dateQuery },
            { $unwind: '$sports' },
            {
                $group: {
                    _id: '$sports',
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'sports',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'sport',
                },
            },
            { $unwind: '$sport' },
            {
                $project: {
                    sportName: '$sport.name',
                    count: 1,
                },
            },
        ]);
        const bySport = {};
        sportCounts.forEach((item) => {
            bySport[item.sportName] = item.count;
        });
        // Get counts by city
        const cityCounts = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$location.address.city',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byCity = {};
        cityCounts.forEach((item) => {
            if (item._id) {
                byCity[item._id] = item.count;
            }
        });
        // Get counts by state
        const stateCounts = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$location.address.state',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byState = {};
        stateCounts.forEach((item) => {
            if (item._id) {
                byState[item._id] = item.count;
            }
        });
        // Get centers allowing disabled participants
        const disabledCounts = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$allowed_disabled',
                    count: { $sum: 1 },
                },
            },
        ]);
        const allowingDisabled = disabledCounts.find((item) => item._id === true)?.count || 0;
        // Get centers only for disabled
        const onlyDisabledCounts = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$is_only_for_disabled',
                    count: { $sum: 1 },
                },
            },
        ]);
        const onlyForDisabled = onlyDisabledCounts.find((item) => item._id === true)?.count || 0;
        // Get centers only for female candidates (allowed_genders is exactly ['female'])
        const onlyForFemale = await coachingCenter_model_1.CoachingCenterModel.countDocuments({
            ...dateQuery,
            allowed_genders: ['female'],
        });
        return {
            total,
            byStatus,
            byActiveStatus,
            byApprovalStatus,
            bySport,
            byCity,
            byState,
            allowingDisabled,
            onlyForDisabled,
            onlyForFemale,
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get coaching center stats:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCoachingCenterStats = getCoachingCenterStats;
/**
 * Approve or reject coaching center
 * Only super_admin and admin can approve/reject
 */
const updateApprovalStatus = async (id, isApproved, rejectReason, currentUserRole) => {
    try {
        // Only super_admin and admin can approve/reject
        if (currentUserRole !== defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN && currentUserRole !== defaultRoles_enum_1.DefaultRoles.ADMIN) {
            throw new ApiError_1.ApiError(403, 'Only super admin and admin can approve or reject academies');
        }
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const existingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!existingCenter || existingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const updateData = {
            approval_status: isApproved ? adminApprove_enum_1.AdminApproveStatus.APPROVE : adminApprove_enum_1.AdminApproveStatus.REJECT,
        };
        // If rejecting, store reject reason; if approving, clear reject reason
        if (isApproved) {
            updateData.reject_reason = null;
        }
        else {
            if (rejectReason) {
                updateData.reject_reason = rejectReason;
            }
        }
        const updatedCenter = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true })
            .populate('user', 'id firstName lastName email')
            .lean();
        if (!updatedCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        logger_1.logger.info('Coaching center approval status updated', {
            id,
            isApproved,
            rejectReason: rejectReason || null,
        });
        // Send notification to academy owner about approval status change
        try {
            const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
            const centerName = updatedCenter.center_name || 'Your Academy';
            const centerId = updatedCenter.id || id; // Use coaching center ID for academy recipient type
            if (centerId) {
                const title = isApproved
                    ? 'Academy Approved'
                    : 'Academy Rejected';
                const body = isApproved
                    ? `Congratulations! Your academy "${centerName}" has been approved and is now live on PlayAsport.`
                    : `Your academy "${centerName}" has been rejected.${rejectReason ? ` Reason: ${rejectReason}` : ''}`;
                await createAndSendNotification({
                    recipientType: 'academy',
                    recipientId: centerId,
                    title,
                    body,
                    channels: ['push'],
                    priority: isApproved ? 'medium' : 'high',
                    data: {
                        type: 'coaching_center_approval_status_changed',
                        coachingCenterId: id,
                        centerName,
                        approvalStatus: isApproved ? adminApprove_enum_1.AdminApproveStatus.APPROVE : adminApprove_enum_1.AdminApproveStatus.REJECT,
                        rejectReason: rejectReason || null,
                        isApproved,
                    },
                    metadata: {
                        source: 'admin_approval_status_update',
                        changedAt: new Date().toISOString(),
                    },
                });
            }
        }
        catch (notificationError) {
            logger_1.logger.error('Failed to create notification for approval status change', { notificationError });
            // Don't throw error - notification failure shouldn't break the approval process
        }
        return await commonService.getCoachingCenterById(id);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to update approval status:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update approval status');
    }
};
exports.updateApprovalStatus = updateApprovalStatus;
/**
 * Get employees (coaches) by coaching center ID
 */
const getEmployeesByCoachingCenterId = async (coachingCenterId, page = 1, limit = env_1.config.pagination.defaultLimit, roleName, search) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Get coaching center by ID (supports both MongoDB ObjectId and custom UUID id)
        let centerObjectId = null;
        if (mongoose_1.Types.ObjectId.isValid(coachingCenterId) && coachingCenterId.length === 24) {
            // Try to find by MongoDB ObjectId
            const center = await coachingCenter_model_1.CoachingCenterModel.findById(coachingCenterId).select('_id').lean();
            if (center) {
                centerObjectId = center._id;
            }
        }
        // If not found by ObjectId, try to find by custom UUID id
        if (!centerObjectId) {
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
                .select('_id')
                .lean();
            if (center) {
                centerObjectId = center._id;
            }
        }
        // Verify coaching center exists
        if (!centerObjectId) {
            throw new ApiError_1.ApiError(404, 'Coaching center not found');
        }
        // Build query - get non-deleted employees for this center
        const query = {
            center: centerObjectId,
            is_deleted: false,
        };
        // Filter by role name if provided
        if (roleName) {
            const role = await role_model_1.RoleModel.findOne({ name: roleName.trim() });
            if (!role) {
                throw new ApiError_1.ApiError(404, `Role with name '${roleName}' not found`);
            }
            query.role = role._id;
        }
        // Add search filter if provided
        if (search) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { fullName: searchRegex },
                { email: searchRegex },
                { mobileNo: searchRegex },
            ];
        }
        // Get total count
        const total = await employee_model_1.EmployeeModel.countDocuments(query);
        // Get paginated results with populated fields
        const employees = await employee_model_1.EmployeeModel.find(query)
            .populate('userId', 'id firstName lastName email mobile')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Employees fetched by coaching center', {
            coachingCenterId,
            roleName,
            search,
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
        });
        return {
            coachingCenters: employees, // Reusing the interface structure
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch employees by coaching center:', error);
        throw new ApiError_1.ApiError(500, 'Failed to fetch employees');
    }
};
exports.getEmployeesByCoachingCenterId = getEmployeesByCoachingCenterId;
/**
 * Get coaches (employees with role 'coach') for a coaching center.
 * Returns only id and name. Supports search by name. Default limit 100.
 */
const getCoachesListByCoachingCenterId = async (coachingCenterId, search, page = 1, limit = 100) => {
    try {
        const centerObjectId = await getCenterObjectId(coachingCenterId);
        if (!centerObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const coachRole = await role_model_1.RoleModel.findOne({ name: 'coach' });
        if (!coachRole) {
            return {
                coaches: [],
                pagination: { page: 1, limit: Math.min(100, Math.max(1, limit)), total: 0, totalPages: 0 },
            };
        }
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(100, Math.max(1, Math.floor(limit)));
        const query = {
            center: centerObjectId,
            role: coachRole._id,
            is_deleted: false,
        };
        if (search && search.trim()) {
            query.fullName = new RegExp(search.trim(), 'i');
        }
        const [total, employees] = await Promise.all([
            employee_model_1.EmployeeModel.countDocuments(query),
            employee_model_1.EmployeeModel.find(query).select('_id fullName').sort({ fullName: 1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
        ]);
        const totalPages = Math.ceil(total / pageSize);
        const coaches = employees.map((emp) => ({
            id: emp._id?.toString() || '',
            name: emp.fullName || '',
        }));
        return {
            coaches,
            pagination: { page: pageNumber, limit: pageSize, total, totalPages },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to get coaches list', { coachingCenterId, error });
        throw new ApiError_1.ApiError(500, 'Failed to get coaches');
    }
};
exports.getCoachesListByCoachingCenterId = getCoachesListByCoachingCenterId;
/**
 * Create a coach (employee) for a coaching center.
 * Accepts only name and coaching center ID (from URL). Uses the coaching center's owner (user) as the employee's userId.
 */
const createCoachForCoachingCenter = async (coachingCenterId, name) => {
    try {
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            throw new ApiError_1.ApiError(400, 'Name is required');
        }
        const centerObjectId = await getCenterObjectId(coachingCenterId);
        if (!centerObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId).select('user').lean();
        if (!coachingCenter?.user) {
            throw new ApiError_1.ApiError(404, 'Coaching center has no associated user');
        }
        const centerUserId = coachingCenter.user;
        const coachRole = await role_model_1.RoleModel.findOne({ name: 'coach' });
        if (!coachRole) {
            throw new ApiError_1.ApiError(404, "Role with name 'coach' not found. Please ensure the coach role exists in the database.");
        }
        const employee = new employee_model_1.EmployeeModel({
            userId: centerUserId,
            fullName: trimmedName,
            role: coachRole._id,
            center: centerObjectId,
            workingHours: null,
            email: null,
            sport: null,
            experience: null,
            extraHours: null,
            certification: null,
            salary: null,
            is_active: true,
            is_deleted: false,
        });
        await employee.save();
        logger_1.logger.info('Coach created for coaching center', {
            coachingCenterId,
            employeeId: employee._id?.toString(),
            fullName: trimmedName,
        });
        return { id: employee._id.toString(), name: employee.fullName };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create coach for coaching center', {
            coachingCenterId,
            name,
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to create coach');
    }
};
exports.createCoachForCoachingCenter = createCoachForCoachingCenter;
/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only)
 * Includes Redis caching for improved performance
 */
const listCoachingCentersSimple = async (page = 1, limit = env_1.config.pagination.defaultLimit, search, status, isActive, centerId, currentUserId, currentUserRole) => {
    try {
        // If centerId is provided, return full details of that specific center
        if (centerId) {
            // Try to get from cache first
            const cachedResult = await (0, coachingCenterCache_1.getCachedCoachingCentersList)(1, 1, undefined, status, isActive, centerId);
            if (cachedResult) {
                logger_1.logger.debug('Returning cached coaching center details', { centerId, status, isActive });
                return cachedResult;
            }
            const centerObjectId = await getCenterObjectId(centerId);
            if (!centerObjectId) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
            }
            // Build query with filters
            const query = {
                _id: centerObjectId,
                is_deleted: false,
            };
            // If user is an agent, verify the center was added by them
            if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
                // Get AdminUser ObjectId since addedBy references AdminUser model
                const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                    .select('_id')
                    .lean();
                if (adminUser && adminUser._id) {
                    query.addedBy = adminUser._id;
                }
                else {
                    // Agent not found, return not found
                    throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
                }
            }
            // Simple list includes all statuses (draft, published) and all active states (active, inactive) - no status/isActive filter
            const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query)
                .populate('sport_details.sport_id', 'custom_id name _id')
                .select('_id center_name sport_details')
                .lean();
            if (!coachingCenter) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
            }
            // Transform response to only include: id, center_name, and sport_details (with name and id only)
            const transformedCenter = {
                id: coachingCenter._id.toString(), // MongoDB ObjectId as string
                center_name: coachingCenter.center_name,
                sport_details: (coachingCenter.sport_details || []).map((sportDetail) => {
                    const sport = sportDetail.sport_id;
                    return {
                        id: sport?._id?.toString() || sport?.custom_id || null,
                        name: sport?.name || null,
                    };
                }).filter((sd) => sd.id && sd.name), // Filter out any invalid entries
            };
            const result = {
                coachingCenters: [transformedCenter],
                pagination: {
                    page: 1,
                    limit: 1,
                    total: 1,
                    totalPages: 1,
                },
            };
            // Cache the result for centerId-specific requests (non-blocking)
            (0, coachingCenterCache_1.cacheCoachingCentersList)(1, 1, undefined, status, isActive, centerId, result).catch((cacheError) => {
                logger_1.logger.warn('Failed to cache coaching center details (non-blocking)', {
                    centerId,
                    status,
                    isActive,
                    error: cacheError instanceof Error ? cacheError.message : cacheError,
                });
            });
            return result;
        }
        // Otherwise, return simple list
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Try to get from cache first
        const cachedResult = await (0, coachingCenterCache_1.getCachedCoachingCentersList)(pageNumber, pageSize, search, status, isActive, centerId);
        if (cachedResult) {
            logger_1.logger.debug('Returning cached coaching centers list', { page: pageNumber, limit: pageSize, search, status, isActive, centerId });
            return cachedResult;
        }
        const query = { is_deleted: false };
        // If user is an agent, only show centers added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                query.addedBy = adminUser._id;
                logger_1.logger.debug('Filtering coaching centers list for agent', {
                    agentId: currentUserId,
                    agentObjectId: adminUser._id.toString(),
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found for list', { agentId: currentUserId });
                // Return empty result if agent not found
                return {
                    coachingCenters: [],
                    pagination: {
                        page: pageNumber,
                        limit: pageSize,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }
        }
        // Simple list includes draft, published, active, and inactive - no status/isActive filter applied
        // Note: No approval_status filter - includes all centers (approved, rejected, pending_approval)
        // Add search filter if provided
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.center_name = searchRegex;
        }
        // Execute count and find queries in parallel
        const [total, coachingCenters] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.countDocuments(query),
            coachingCenter_model_1.CoachingCenterModel.find(query)
                .select('_id center_name')
                .sort({ center_name: 1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / pageSize);
        const result = {
            coachingCenters: coachingCenters.map((center) => ({
                id: center._id.toString(), // Return MongoDB ObjectId as string
                center_name: center.center_name,
            })),
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
            },
        };
        // Cache the result (non-blocking)
        (0, coachingCenterCache_1.cacheCoachingCentersList)(pageNumber, pageSize, search, status, isActive, centerId, result).catch((cacheError) => {
            logger_1.logger.warn('Failed to cache coaching centers list (non-blocking)', {
                page: pageNumber,
                limit: pageSize,
                search,
                status,
                isActive,
                centerId,
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        });
        return result;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to list coaching centers:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.list.failed'));
    }
};
exports.listCoachingCentersSimple = listCoachingCentersSimple;
//# sourceMappingURL=adminCoachingCenter.service.js.map