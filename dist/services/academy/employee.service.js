"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.toggleEmployeeStatus = exports.updateEmployee = exports.getEmployeesByUser = exports.getEmployeeById = exports.createEmployee = void 0;
const mongoose_1 = require("mongoose");
const employee_model_1 = require("../../models/employee.model");
const role_model_1 = require("../../models/role.model");
const sport_model_1 = require("../../models/sport.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const env_1 = require("../../config/env");
const createEmployee = async (data, _loggedInUserId) => {
    try {
        // Validate user exists
        if (!data.userId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.idRequired'));
        }
        const userObjectId = await (0, userCache_1.getUserObjectId)(data.userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('employee.notFound'));
        }
        // Validate role exists
        if (!mongoose_1.Types.ObjectId.isValid(data.role)) {
            throw new ApiError_1.ApiError(400, 'Invalid role ID');
        }
        const role = await role_model_1.RoleModel.findById(data.role);
        if (!role) {
            throw new ApiError_1.ApiError(404, 'Role not found');
        }
        // Validate sport exists if provided
        if (data.sport) {
            if (!mongoose_1.Types.ObjectId.isValid(data.sport)) {
                throw new ApiError_1.ApiError(400, 'Invalid sport ID');
            }
            const sport = await sport_model_1.SportModel.findById(data.sport);
            if (!sport) {
                throw new ApiError_1.ApiError(404, 'Sport not found');
            }
        }
        // Validate center exists if provided
        if (data.center) {
            if (!mongoose_1.Types.ObjectId.isValid(data.center)) {
                throw new ApiError_1.ApiError(400, 'Invalid center ID');
            }
            const center = await coachingCenter_model_1.CoachingCenterModel.findById(data.center);
            if (!center || center.is_deleted) {
                throw new ApiError_1.ApiError(404, 'Coaching center not found');
            }
        }
        // Check if mobile number already exists for another employee
        const existingMobile = await employee_model_1.EmployeeModel.findOne({
            mobileNo: data.mobileNo,
            is_deleted: false,
        });
        if (existingMobile) {
            throw new ApiError_1.ApiError(409, (0, i18n_1.t)('employee.mobileExists'));
        }
        // Check if email already exists (if provided)
        if (data.email) {
            const existingEmail = await employee_model_1.EmployeeModel.findOne({
                email: data.email,
                is_deleted: false,
            });
            if (existingEmail) {
                throw new ApiError_1.ApiError(409, (0, i18n_1.t)('employee.emailExists'));
            }
        }
        // Prepare employee data
        const employeeData = {
            userId: userObjectId,
            fullName: data.fullName,
            role: new mongoose_1.Types.ObjectId(data.role),
            mobileNo: data.mobileNo,
            email: data.email || null,
            sport: data.sport ? new mongoose_1.Types.ObjectId(data.sport) : null,
            center: data.center ? new mongoose_1.Types.ObjectId(data.center) : null,
            experience: data.experience || null,
            workingHours: data.workingHours,
            extraHours: data.extraHours || null,
            certification: data.certification || null,
            salary: data.salary || null,
            is_active: true,
            is_deleted: false,
        };
        // Create employee
        const employee = new employee_model_1.EmployeeModel(employeeData);
        await employee.save();
        logger_1.logger.info(`Employee created: ${employee._id} (${employee.fullName})`);
        // Return populated employee
        const populatedEmployee = await employee_model_1.EmployeeModel.findById(employee._id)
            .populate('userId', 'id firstName lastName email')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .lean();
        return populatedEmployee || employee;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create employee:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.create.failed'));
    }
};
exports.createEmployee = createEmployee;
const getEmployeeById = async (id) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.invalidId'));
        }
        const employee = await employee_model_1.EmployeeModel.findOne({
            _id: id,
            is_deleted: false,
        })
            .populate('userId', 'id firstName lastName email')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .lean();
        return employee;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch employee:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.get.failed'));
    }
};
exports.getEmployeeById = getEmployeeById;
const getEmployeesByUser = async (userId, page = 1, limit = env_1.config.pagination.defaultLimit, roleName) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Build query - only get non-deleted employees for the user
        const query = {
            userId: userObjectId,
            is_deleted: false,
        };
        // Filter by role name if provided
        if (roleName) {
            // Escape special regex characters to prevent regex injection
            const escapedRoleName = roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const role = await role_model_1.RoleModel.findOne({
                name: { $regex: new RegExp(`^${escapedRoleName}$`, 'i') }, // Case-insensitive exact match
            });
            if (!role) {
                // If role not found, return empty results
                return {
                    data: [],
                    pagination: {
                        page: pageNumber,
                        limit: pageSize,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                };
            }
            query.role = role._id;
        }
        // Get total count
        const total = await employee_model_1.EmployeeModel.countDocuments(query);
        // Get paginated results
        const employees = await employee_model_1.EmployeeModel.find(query)
            .populate('userId', 'id firstName lastName email')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Employees fetched by user', {
            userId,
            page: pageNumber,
            limit: pageSize,
            roleName,
            total,
            totalPages,
        });
        return {
            data: employees,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch employees:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.list.failed'));
    }
};
exports.getEmployeesByUser = getEmployeesByUser;
const updateEmployee = async (id, data, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.invalidId'));
        }
        // Check if employee exists and belongs to logged-in user
        const existingEmployee = await employee_model_1.EmployeeModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!existingEmployee) {
            throw new ApiError_1.ApiError(404, 'Employee not found');
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, 'Logged-in user not found');
        }
        // Verify employee belongs to logged-in user
        if (existingEmployee.userId.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('employee.unauthorizedUpdate'));
        }
        // Validate role if provided
        if (data.role) {
            if (!mongoose_1.Types.ObjectId.isValid(data.role)) {
                throw new ApiError_1.ApiError(400, 'Invalid role ID');
            }
            const role = await role_model_1.RoleModel.findById(data.role);
            if (!role) {
                throw new ApiError_1.ApiError(404, 'Role not found');
            }
        }
        // Validate sport if provided
        if (data.sport) {
            if (!mongoose_1.Types.ObjectId.isValid(data.sport)) {
                throw new ApiError_1.ApiError(400, 'Invalid sport ID');
            }
            const sport = await sport_model_1.SportModel.findById(data.sport);
            if (!sport) {
                throw new ApiError_1.ApiError(404, 'Sport not found');
            }
        }
        // Validate center if provided
        if (data.center) {
            if (!mongoose_1.Types.ObjectId.isValid(data.center)) {
                throw new ApiError_1.ApiError(400, 'Invalid center ID');
            }
            const center = await coachingCenter_model_1.CoachingCenterModel.findById(data.center);
            if (!center || center.is_deleted) {
                throw new ApiError_1.ApiError(404, 'Coaching center not found');
            }
        }
        // Check if mobile number already exists for another employee
        if (data.mobileNo) {
            const existingMobile = await employee_model_1.EmployeeModel.findOne({
                mobileNo: data.mobileNo,
                is_deleted: false,
                _id: { $ne: id },
            });
            if (existingMobile) {
                throw new ApiError_1.ApiError(409, (0, i18n_1.t)('employee.mobileExists'));
            }
        }
        // Check if email already exists (if provided)
        if (data.email !== undefined && data.email !== null) {
            const existingEmail = await employee_model_1.EmployeeModel.findOne({
                email: data.email,
                is_deleted: false,
                _id: { $ne: id },
            });
            if (existingEmail) {
                throw new ApiError_1.ApiError(409, (0, i18n_1.t)('employee.emailExists'));
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.fullName !== undefined)
            updateData.fullName = data.fullName;
        if (data.role !== undefined)
            updateData.role = new mongoose_1.Types.ObjectId(data.role);
        if (data.mobileNo !== undefined)
            updateData.mobileNo = data.mobileNo;
        if (data.email !== undefined)
            updateData.email = data.email || null;
        if (data.sport !== undefined)
            updateData.sport = data.sport ? new mongoose_1.Types.ObjectId(data.sport) : null;
        if (data.center !== undefined)
            updateData.center = data.center ? new mongoose_1.Types.ObjectId(data.center) : null;
        if (data.experience !== undefined)
            updateData.experience = data.experience || null;
        if (data.workingHours !== undefined)
            updateData.workingHours = data.workingHours;
        if (data.extraHours !== undefined)
            updateData.extraHours = data.extraHours || null;
        if (data.certification !== undefined)
            updateData.certification = data.certification || null;
        if (data.salary !== undefined)
            updateData.salary = data.salary || null;
        // Update employee
        const employee = await employee_model_1.EmployeeModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('userId', 'id firstName lastName email')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .lean();
        if (!employee) {
            throw new ApiError_1.ApiError(404, 'Employee not found');
        }
        logger_1.logger.info(`Employee updated: ${id}`);
        return employee;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update employee:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.update.failed'));
    }
};
exports.updateEmployee = updateEmployee;
const toggleEmployeeStatus = async (id, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.invalidId'));
        }
        // Check if employee exists
        const employee = await employee_model_1.EmployeeModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!employee) {
            throw new ApiError_1.ApiError(404, 'Employee not found');
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, 'Logged-in user not found');
        }
        // Verify employee belongs to logged-in user
        if (employee.userId.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('employee.unauthorizedToggle'));
        }
        // Toggle is_active status
        const updatedEmployee = await employee_model_1.EmployeeModel.findByIdAndUpdate(id, { $set: { is_active: !employee.is_active } }, { new: true })
            .populate('userId', 'id firstName lastName email')
            .populate('role', 'name description')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .lean();
        if (!updatedEmployee) {
            throw new ApiError_1.ApiError(404, 'Employee not found');
        }
        logger_1.logger.info(`Employee status toggled: ${id} (is_active: ${updatedEmployee.is_active})`);
        return updatedEmployee;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to toggle employee status:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.toggleStatus.failed'));
    }
};
exports.toggleEmployeeStatus = toggleEmployeeStatus;
const deleteEmployee = async (id, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.invalidId'));
        }
        // Check if employee exists
        const employee = await employee_model_1.EmployeeModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!employee) {
            throw new ApiError_1.ApiError(404, 'Employee not found');
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, 'Logged-in user not found');
        }
        // Verify employee belongs to logged-in user
        if (employee.userId.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('employee.unauthorizedDelete'));
        }
        // Soft delete employee
        await employee_model_1.EmployeeModel.findByIdAndUpdate(id, {
            $set: {
                is_deleted: true,
                deletedAt: new Date(),
            },
        });
        logger_1.logger.info(`Employee soft deleted: ${id}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete employee:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.delete.failed'));
    }
};
exports.deleteEmployee = deleteEmployee;
//# sourceMappingURL=employee.service.js.map