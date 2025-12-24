import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminLocationService from '../../services/admin/location.service';
import {
  CreateCountryInput,
  UpdateCountryInput,
  CreateStateInput,
  UpdateStateInput,
  CreateCityInput,
  UpdateCityInput,
} from '../../validations/location.validation';

// ==================== COUNTRY CONTROLLERS ====================

/**
 * Get all countries for admin
 */
export const getAllCountries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, region, subregion, sortBy, sortOrder } = req.query;

    const params: adminLocationService.GetAdminCountriesParams = {
      page,
      limit,
      search: search as string,
      region: region as string,
      subregion: subregion as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminLocationService.getAllCountries(params);

    const response = new ApiResponse(200, { countries: result.items, pagination: result.pagination }, 'Countries retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get country by ID for admin
 */
export const getCountryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const country = await adminLocationService.getCountryById(id);

    if (!country) {
      throw new ApiError(404, 'Country not found');
    }

    const response = new ApiResponse(200, { country }, 'Country retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new country
 */
export const createCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateCountryInput = req.body;
    const country = await adminLocationService.createCountry(data);

    const response = new ApiResponse(201, { country }, 'Country created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update country by admin
 */
export const updateCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateCountryInput = req.body;

    const country = await adminLocationService.updateCountry(id, data);

    if (!country) {
      throw new ApiError(404, 'Country not found');
    }

    const response = new ApiResponse(200, { country }, 'Country updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete country
 */
export const deleteCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminLocationService.deleteCountry(id);

    const response = new ApiResponse(200, null, 'Country deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// ==================== STATE CONTROLLERS ====================

/**
 * Get all states for admin
 */
export const getAllStates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, countryId, countryCode, sortBy, sortOrder } = req.query;

    const params: adminLocationService.GetAdminStatesParams = {
      page,
      limit,
      search: search as string,
      countryId: countryId as string,
      countryCode: countryCode as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminLocationService.getAllStates(params);

    const response = new ApiResponse(200, { states: result.items, pagination: result.pagination }, 'States retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get state by ID for admin
 */
export const getStateById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const state = await adminLocationService.getStateById(id);

    if (!state) {
      throw new ApiError(404, 'State not found');
    }

    const response = new ApiResponse(200, { state }, 'State retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new state
 */
export const createState = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateStateInput = req.body;
    const state = await adminLocationService.createState(data);

    const response = new ApiResponse(201, { state }, 'State created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update state by admin
 */
export const updateState = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateStateInput = req.body;

    const state = await adminLocationService.updateState(id, data);

    if (!state) {
      throw new ApiError(404, 'State not found');
    }

    const response = new ApiResponse(200, { state }, 'State updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete state
 */
export const deleteState = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminLocationService.deleteState(id);

    const response = new ApiResponse(200, null, 'State deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// ==================== CITY CONTROLLERS ====================

/**
 * Get all cities for admin
 */
export const getAllCities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, stateId, stateName, countryId, countryCode, sortBy, sortOrder } = req.query;

    const params: adminLocationService.GetAdminCitiesParams = {
      page,
      limit,
      search: search as string,
      stateId: stateId as string,
      stateName: stateName as string,
      countryId: countryId as string,
      countryCode: countryCode as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminLocationService.getAllCities(params);

    const response = new ApiResponse(200, { cities: result.items, pagination: result.pagination }, 'Cities retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get city by ID for admin
 */
export const getCityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const city = await adminLocationService.getCityById(id);

    if (!city) {
      throw new ApiError(404, 'City not found');
    }

    const response = new ApiResponse(200, { city }, 'City retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new city
 */
export const createCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateCityInput = req.body;
    const city = await adminLocationService.createCity(data);

    const response = new ApiResponse(201, { city }, 'City created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update city by admin
 */
export const updateCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateCityInput = req.body;

    const city = await adminLocationService.updateCity(id, data);

    if (!city) {
      throw new ApiError(404, 'City not found');
    }

    const response = new ApiResponse(200, { city }, 'City updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete city
 */
export const deleteCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminLocationService.deleteCity(id);

    const response = new ApiResponse(200, null, 'City deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

