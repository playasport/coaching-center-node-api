import { Types } from 'mongoose';
import { EmployeeModel, Employee } from '../../models/employee.model';
import { RoleModel } from '../../models/role.model';
import { SportModel } from '../../models/sport.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '../../validations/employee.validation';
import { getUserObjectId } from '../../utils/userCache';
import { config } from '../../config/env';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const createEmployee = async (
  data: EmployeeCreateInput,
  _loggedInUserId: string
): Promise<Employee> => {
  try {
    // Validate user exists
    if (!data.userId) {
      throw new ApiError(400, t('employee.idRequired'));
    }
    const userObjectId = await getUserObjectId(data.userId);
    if (!userObjectId) {
      throw new ApiError(404, t('employee.notFound'));
    }

    // Validate role exists
    if (!Types.ObjectId.isValid(data.role)) {
      throw new ApiError(400, 'Invalid role ID');
    }
    const role = await RoleModel.findById(data.role);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Validate sport exists if provided
    if (data.sport) {
      if (!Types.ObjectId.isValid(data.sport)) {
        throw new ApiError(400, 'Invalid sport ID');
      }
      const sport = await SportModel.findById(data.sport);
      if (!sport) {
        throw new ApiError(404, 'Sport not found');
      }
    }

    // Validate center exists if provided
    if (data.center) {
      if (!Types.ObjectId.isValid(data.center)) {
        throw new ApiError(400, 'Invalid center ID');
      }
      const center = await CoachingCenterModel.findById(data.center);
      if (!center || center.is_deleted) {
        throw new ApiError(404, 'Coaching center not found');
      }
    }

    // Check if mobile number already exists for another employee
    const existingMobile = await EmployeeModel.findOne({
      mobileNo: data.mobileNo,
      is_deleted: false,
    });

    if (existingMobile) {
      throw new ApiError(409, t('employee.mobileExists'));
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await EmployeeModel.findOne({
        email: data.email,
        is_deleted: false,
      });

      if (existingEmail) {
        throw new ApiError(409, t('employee.emailExists'));
      }
    }

    // Prepare employee data
    const employeeData: any = {
      userId: userObjectId,
      fullName: data.fullName,
      role: new Types.ObjectId(data.role),
      mobileNo: data.mobileNo,
      email: data.email || null,
      sport: data.sport ? new Types.ObjectId(data.sport) : null,
      center: data.center ? new Types.ObjectId(data.center) : null,
      experience: data.experience || null,
      workingHours: data.workingHours,
      extraHours: data.extraHours || null,
      certification: data.certification || null,
      salary: data.salary || null,
      is_active: true,
      is_deleted: false,
    };

    // Create employee
    const employee = new EmployeeModel(employeeData);
    await employee.save();

    logger.info(`Employee created: ${employee._id} (${employee.fullName})`);

    // Return populated employee
    const populatedEmployee = await EmployeeModel.findById(employee._id)
      .populate('userId', 'id firstName lastName email')
      .populate('role', 'name description')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .lean();

    return populatedEmployee || employee;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create employee:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, t('employee.create.failed'));
  }
};

export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('employee.invalidId'));
    }

    const employee = await EmployeeModel.findOne({
      _id: id,
      is_deleted: false,
    })
      .populate('userId', 'id firstName lastName email')
      .populate('role', 'name description')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .lean();

    return employee;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch employee:', error);
    throw new ApiError(500, t('employee.get.failed'));
  }
};

export const getEmployeesByUser = async (
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  roleName?: string
): Promise<PaginatedResult<Employee>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(
      config.pagination.maxLimit,
      Math.max(1, Math.floor(limit))
    );

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Build query - only get non-deleted employees for the user
    const query: any = {
      userId: userObjectId,
      is_deleted: false,
    };

    // Filter by role name if provided
    if (roleName) {
      // Escape special regex characters to prevent regex injection
      const escapedRoleName = roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const role = await RoleModel.findOne({
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
    const total = await EmployeeModel.countDocuments(query);

    // Get paginated results
    const employees = await EmployeeModel.find(query)
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

    logger.info('Employees fetched by user', {
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
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch employees:', error);
    throw new ApiError(500, t('employee.list.failed'));
  }
};

export const updateEmployee = async (
  id: string,
  data: EmployeeUpdateInput,
  loggedInUserId: string
): Promise<Employee | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('employee.invalidId'));
    }

    // Check if employee exists and belongs to logged-in user
    const existingEmployee = await EmployeeModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!existingEmployee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, 'Logged-in user not found');
    }

    // Verify employee belongs to logged-in user
    if (existingEmployee.userId.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('employee.unauthorizedUpdate'));
    }

    // Validate role if provided
    if (data.role) {
      if (!Types.ObjectId.isValid(data.role)) {
        throw new ApiError(400, 'Invalid role ID');
      }
      const role = await RoleModel.findById(data.role);
      if (!role) {
        throw new ApiError(404, 'Role not found');
      }
    }

    // Validate sport if provided
    if (data.sport) {
      if (!Types.ObjectId.isValid(data.sport)) {
        throw new ApiError(400, 'Invalid sport ID');
      }
      const sport = await SportModel.findById(data.sport);
      if (!sport) {
        throw new ApiError(404, 'Sport not found');
      }
    }

    // Validate center if provided
    if (data.center) {
      if (!Types.ObjectId.isValid(data.center)) {
        throw new ApiError(400, 'Invalid center ID');
      }
      const center = await CoachingCenterModel.findById(data.center);
      if (!center || center.is_deleted) {
        throw new ApiError(404, 'Coaching center not found');
      }
    }

    // Check if mobile number already exists for another employee
    if (data.mobileNo) {
      const existingMobile = await EmployeeModel.findOne({
        mobileNo: data.mobileNo,
        is_deleted: false,
        _id: { $ne: id },
      });

      if (existingMobile) {
        throw new ApiError(409, t('employee.mobileExists'));
      }
    }

    // Check if email already exists (if provided)
    if (data.email !== undefined && data.email !== null) {
      const existingEmail = await EmployeeModel.findOne({
        email: data.email,
        is_deleted: false,
        _id: { $ne: id },
      });

      if (existingEmail) {
        throw new ApiError(409, t('employee.emailExists'));
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.role !== undefined) updateData.role = new Types.ObjectId(data.role);
    if (data.mobileNo !== undefined) updateData.mobileNo = data.mobileNo;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.sport !== undefined) updateData.sport = data.sport ? new Types.ObjectId(data.sport) : null;
    if (data.center !== undefined) updateData.center = data.center ? new Types.ObjectId(data.center) : null;
    if (data.experience !== undefined) updateData.experience = data.experience || null;
    if (data.workingHours !== undefined) updateData.workingHours = data.workingHours;
    if (data.extraHours !== undefined) updateData.extraHours = data.extraHours || null;
    if (data.certification !== undefined) updateData.certification = data.certification || null;
    if (data.salary !== undefined) updateData.salary = data.salary || null;

    // Update employee
    const employee = await EmployeeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('userId', 'id firstName lastName email')
      .populate('role', 'name description')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .lean();

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    logger.info(`Employee updated: ${id}`);

    return employee;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update employee:', error);
    throw new ApiError(500, t('employee.update.failed'));
  }
};

export const toggleEmployeeStatus = async (id: string, loggedInUserId: string): Promise<Employee | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('employee.invalidId'));
    }

    // Check if employee exists
    const employee = await EmployeeModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, 'Logged-in user not found');
    }

    // Verify employee belongs to logged-in user
    if (employee.userId.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('employee.unauthorizedToggle'));
    }

    // Toggle is_active status
    const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
      id,
      { $set: { is_active: !employee.is_active } },
      { new: true }
    )
      .populate('userId', 'id firstName lastName email')
      .populate('role', 'name description')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .lean();

    if (!updatedEmployee) {
      throw new ApiError(404, 'Employee not found');
    }

    logger.info(`Employee status toggled: ${id} (is_active: ${updatedEmployee.is_active})`);

    return updatedEmployee;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to toggle employee status:', error);
    throw new ApiError(500, t('employee.toggleStatus.failed'));
  }
};

export const deleteEmployee = async (id: string, loggedInUserId: string): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('employee.invalidId'));
    }

    // Check if employee exists
    const employee = await EmployeeModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, 'Logged-in user not found');
    }

    // Verify employee belongs to logged-in user
    if (employee.userId.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('employee.unauthorizedDelete'));
    }

    // Soft delete employee
    await EmployeeModel.findByIdAndUpdate(id, {
      $set: {
        is_deleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(`Employee soft deleted: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete employee:', error);
    throw new ApiError(500, t('employee.delete.failed'));
  }
};


