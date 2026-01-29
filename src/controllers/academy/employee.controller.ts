import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as employeeService from '../../services/academy/employee.service';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '../../validations/employee.validation';

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as EmployeeCreateInput;

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Always set userId from logged-in user (userId in request body is ignored)
    data.userId = req.user.id;

    const employee = await employeeService.createEmployee(data, req.user.id);

    const response = new ApiResponse(
      201,
      { employee },
      t('employee.create.success')
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('employee.idRequired'));
    }

    const employee = await employeeService.getEmployeeById(id);

    if (!employee) {
      throw new ApiError(404, t('employee.notFound'));
    }

    const response = new ApiResponse(
      200,
      { employee },
      t('employee.get.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('employee.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as EmployeeUpdateInput;

    const employee = await employeeService.updateEmployee(id, data, req.user.id);

    if (!employee) {
      throw new ApiError(404, t('employee.notFound'));
    }

    const response = new ApiResponse(
      200,
      { employee },
      t('employee.update.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const toggleEmployeeStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('employee.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const employee = await employeeService.toggleEmployeeStatus(id, req.user.id);

    if (!employee) {
      throw new ApiError(404, t('employee.notFound'));
    }

    const statusMessage = employee.is_active
      ? t('employee.toggleStatus.active')
      : t('employee.toggleStatus.inactive');

    const response = new ApiResponse(
      200,
      { employee },
      statusMessage
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('employee.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    await employeeService.deleteEmployee(id, req.user.id);

    const response = new ApiResponse(
      200,
      {},
      t('employee.delete.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMyEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const roleName = req.query.roleName as string | undefined;

    const result = await employeeService.getEmployeesByUser(
      req.user.id,
      page,
      limit,
      roleName
    );

    const response = new ApiResponse(
      200,
      result,
      t('employee.list.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

