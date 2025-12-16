import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as locationService from '../services/location.service';

export const getCountries = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const countries = await locationService.getAllCountries();
    const response = new ApiResponse(200, { countries }, t('location.countries.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getStates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { countryCode } = req.query;

    if (!countryCode || typeof countryCode !== 'string') {
      throw new ApiError(400, t('location.states.countryCodeRequired'));
    }

    const states = await locationService.getStatesByCountry(countryCode);
    const response = new ApiResponse(200, { states }, t('location.states.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getCities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stateId } = req.query;

    if (!stateId || typeof stateId !== 'string') {
      throw new ApiError(400, t('location.cities.stateRequired'));
    }

    const cities = await locationService.getCitiesByStateId(stateId);

    const response = new ApiResponse(200, { cities }, t('location.cities.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getTopCities = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const topCities = await locationService.getTopCities(15);
    const response = new ApiResponse(200, { cities: topCities }, 'Top cities retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

