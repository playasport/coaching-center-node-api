import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminFacilityService from '../../services/admin/facility.service';
import { CreateFacilityInput, UpdateFacilityInput } from '../../validations/facility.validation';

/**
 * Get all facilities for admin
 */
export const getAllFacilities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, isActive, includeDeleted, sortBy, sortOrder } = req.query;

    const params: adminFacilityService.GetAdminFacilitiesParams = {
      page,
      limit,
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      includeDeleted: includeDeleted === 'true',
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminFacilityService.getAllFacilities(params);

    const response = new ApiResponse(200, result, 'Facilities retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get facility by ID for admin
 */
export const getFacilityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const facility = await adminFacilityService.getFacilityById(id);

    if (!facility) {
      throw new ApiError(404, 'Facility not found');
    }

    const response = new ApiResponse(200, { facility }, 'Facility retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new facility
 */
export const createFacility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateFacilityInput = req.body;

    const facility = await adminFacilityService.createFacility(data);

    const response = new ApiResponse(201, { facility }, 'Facility created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update facility by admin
 */
export const updateFacility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateFacilityInput = req.body;

    const facility = await adminFacilityService.updateFacility(id, data);

    if (!facility) {
      throw new ApiError(404, 'Facility not found');
    }

    const response = new ApiResponse(200, { facility }, 'Facility updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete facility (soft delete)
 */
export const deleteFacility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    await adminFacilityService.deleteFacility(id);

    const response = new ApiResponse(200, null, 'Facility deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Restore soft-deleted facility
 */
export const restoreFacility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const facility = await adminFacilityService.restoreFacility(id);

    const response = new ApiResponse(200, { facility }, 'Facility restored successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

