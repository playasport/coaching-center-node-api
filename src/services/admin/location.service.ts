import { CountryModel, StateModel, CityModel, Country, State, City } from '../../models/location.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
import {
  CreateCountryInput,
  UpdateCountryInput,
  CreateStateInput,
  UpdateStateInput,
  CreateCityInput,
  UpdateCityInput,
} from '../../validations/location.validation';

// ==================== COMMON INTERFACES ====================

export interface GetAdminLocationsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminPaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ==================== COUNTRY MANAGEMENT ====================

export interface GetAdminCountriesParams extends GetAdminLocationsParams {
  region?: string;
  subregion?: string;
}

/**
 * Get all countries for admin with filters and pagination
 */
export const getAllCountries = async (
  params: GetAdminCountriesParams = {}
): Promise<AdminPaginatedResult<Country>> => {
  try {
    const query: any = { isDeleted: false };

    // Filter by region if provided
    if (params.region) {
      query.region = { $regex: new RegExp(params.region, 'i') };
    }

    // Filter by subregion if provided
    if (params.subregion) {
      query.subregion = { $regex: new RegExp(params.subregion, 'i') };
    }

    // Search by name, code, iso2, iso3
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { iso2: searchRegex },
        { iso3: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'name';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await CountryModel.countDocuments(query);

    // Get countries
    const countries = await CountryModel.find(query).sort(sort).skip(skip).limit(limit).lean();

    const totalPages = Math.ceil(total / limit);

    return {
      items: countries as Country[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch countries for admin:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get country by ID
 */
export const getCountryById = async (id: string): Promise<Country | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
    }

    const country = await CountryModel.findOne(query).lean();
    return country as Country | null;
  } catch (error) {
    logger.error('Failed to fetch country by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create a new country
 */
export const createCountry = async (data: CreateCountryInput): Promise<Country> => {
  try {
    // Check if country with same name or code already exists (excluding soft-deleted)
    const existingCountry = await CountryModel.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } },
        ...(data.code ? [{ code: data.code.trim() }] : []),
        ...(data.iso2 ? [{ iso2: data.iso2.trim().toUpperCase() }] : []),
      ],
      isDeleted: false,
    });

    if (existingCountry) {
      throw new ApiError(400, 'Country with this name or code already exists');
    }

    const country = new CountryModel({
      name: data.name.trim(),
      code: data.code?.trim() || null,
      iso2: data.iso2?.trim().toUpperCase() || null,
      iso3: data.iso3?.trim().toUpperCase() || null,
      phoneCode: data.phoneCode?.trim() || null,
      currency: data.currency?.trim() || null,
      currencySymbol: data.currencySymbol?.trim() || null,
      region: data.region?.trim() || null,
      subregion: data.subregion?.trim() || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    });

    await country.save();
    return country.toObject();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create country:', error);
    throw new ApiError(500, 'Failed to create country');
  }
};

/**
 * Update country
 */
export const updateCountry = async (id: string, data: UpdateCountryInput): Promise<Country | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
    }

    const existingCountry = await CountryModel.findOne(query);
    if (!existingCountry) {
      throw new ApiError(404, 'Country not found');
    }

    // Check for duplicates if name or code is being updated (excluding soft-deleted)
    if (data.name || data.code || data.iso2) {
      const duplicateQuery: any = { _id: { $ne: existingCountry._id }, isDeleted: false };
      const orConditions: any[] = [];

      if (data.name) {
        orConditions.push({ name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } });
      }
      if (data.code) {
        orConditions.push({ code: data.code.trim() });
      }
      if (data.iso2) {
        orConditions.push({ iso2: data.iso2.trim().toUpperCase() });
      }

      if (orConditions.length > 0) {
        duplicateQuery.$or = orConditions;
        const duplicate = await CountryModel.findOne(duplicateQuery);
        if (duplicate) {
          throw new ApiError(400, 'Country with this name or code already exists');
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.iso2 !== undefined) updateData.iso2 = data.iso2?.trim().toUpperCase() || null;
    if (data.iso3 !== undefined) updateData.iso3 = data.iso3?.trim().toUpperCase() || null;
    if (data.phoneCode !== undefined) updateData.phoneCode = data.phoneCode?.trim() || null;
    if (data.currency !== undefined) updateData.currency = data.currency?.trim() || null;
    if (data.currencySymbol !== undefined) updateData.currencySymbol = data.currencySymbol?.trim() || null;
    if (data.region !== undefined) updateData.region = data.region?.trim() || null;
    if (data.subregion !== undefined) updateData.subregion = data.subregion?.trim() || null;
    if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude || null;

    const updatedCountry = await CountryModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();

    return updatedCountry as Country | null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update country:', error);
    throw new ApiError(500, 'Failed to update country');
  }
};

/**
 * Delete country (soft delete with cascade)
 * Soft deletes the country and all associated states and cities
 */
export const deleteCountry = async (id: string): Promise<void> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
    }

    const country = await CountryModel.findOne(query);
    if (!country) {
      throw new ApiError(404, 'Country not found');
    }

    const countryId = country._id.toString();
    const countryCode = country.code || country.iso2;
    const now = new Date();

    // Soft delete all associated states (cascade)
    const statesResult = await StateModel.updateMany(
      {
        $or: [{ countryId: countryId }, { countryCode: countryCode }],
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      }
    );

    // Soft delete all associated cities (cascade)
    const citiesResult = await CityModel.updateMany(
      {
        $or: [{ countryId: countryId }, { countryCode: countryCode }],
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      }
    );

    // Soft delete the country
    await CountryModel.updateOne(query, {
      $set: {
        isDeleted: true,
        deletedAt: now,
      },
    });

    logger.info(`Country soft deleted: ${id}`, {
      statesDeleted: statesResult.modifiedCount,
      citiesDeleted: citiesResult.modifiedCount,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete country:', error);
    throw new ApiError(500, 'Failed to delete country');
  }
};

// ==================== STATE MANAGEMENT ====================

export interface GetAdminStatesParams extends GetAdminLocationsParams {
  countryId?: string;
  countryCode?: string;
}

/**
 * Get all states for admin with filters and pagination
 */
export const getAllStates = async (params: GetAdminStatesParams = {}): Promise<AdminPaginatedResult<State>> => {
  try {
    const query: any = { isDeleted: false };

    // Filter by country if provided
    if (params.countryId || params.countryCode) {
      const countryQuery: any = {};
      if (params.countryId) {
        if (Types.ObjectId.isValid(params.countryId)) {
          countryQuery.countryId = params.countryId;
        } else {
          // Try to find country by code/iso2/iso3 (excluding soft-deleted)
          const country = await CountryModel.findOne({
            $or: [{ code: params.countryId }, { iso2: params.countryId }, { iso3: params.countryId }],
            isDeleted: false,
          });
          if (country) {
            countryQuery.countryId = country._id.toString();
          }
        }
      }
      if (params.countryCode) {
        countryQuery.countryCode = params.countryCode;
      }
      Object.assign(query, countryQuery);
    }

    // Search by name, stateCode, countryName
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { name: searchRegex },
        { stateCode: searchRegex },
        { countryName: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'name';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await StateModel.countDocuments(query);

    // Get states
    const states = await StateModel.find(query).sort(sort).skip(skip).limit(limit).lean();

    const totalPages = Math.ceil(total / limit);

    return {
      items: states as State[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch states for admin:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get state by ID
 */
export const getStateById = async (id: string): Promise<State | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { stateCode: id, isDeleted: false };
    }

    const state = await StateModel.findOne(query).lean();
    return state as State | null;
  } catch (error) {
    logger.error('Failed to fetch state by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create a new state
 */
export const createState = async (data: CreateStateInput): Promise<State> => {
  try {
    // Validate country exists (excluding soft-deleted)
    let country: any = null;
    if (data.countryId) {
      if (Types.ObjectId.isValid(data.countryId)) {
        country = await CountryModel.findOne({ _id: data.countryId, isDeleted: false });
      } else {
        country = await CountryModel.findOne({
          $or: [{ code: data.countryId }, { iso2: data.countryId }, { iso3: data.countryId }],
          isDeleted: false,
        });
      }
    } else if (data.countryCode) {
      country = await CountryModel.findOne({
        $or: [{ code: data.countryCode }, { iso2: data.countryCode }, { iso3: data.countryCode }],
        isDeleted: false,
      });
    }

    if (!country) {
      throw new ApiError(400, 'Country not found');
    }

    // Check if state with same name in same country already exists (excluding soft-deleted)
    const existingState = await StateModel.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
      $or: [{ countryId: country._id.toString() }, { countryCode: country.code || country.iso2 }],
      isDeleted: false,
    });

    if (existingState) {
      throw new ApiError(400, 'State with this name already exists in this country');
    }

    const state = new StateModel({
      name: data.name.trim(),
      countryId: country._id.toString(),
      countryCode: country.code || country.iso2 || null,
      countryName: country.name,
      stateCode: data.stateCode?.trim() || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    });

    await state.save();
    return state.toObject();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create state:', error);
    throw new ApiError(500, 'Failed to create state');
  }
};

/**
 * Update state
 */
export const updateState = async (id: string, data: UpdateStateInput): Promise<State | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { stateCode: id, isDeleted: false };
    }

    const existingState = await StateModel.findOne(query);
    if (!existingState) {
      throw new ApiError(404, 'State not found');
    }

    // Validate country if being updated (excluding soft-deleted)
    let country: any = null;
    if (data.countryId || data.countryCode) {
      if (data.countryId) {
        if (Types.ObjectId.isValid(data.countryId)) {
          country = await CountryModel.findOne({ _id: data.countryId, isDeleted: false });
        } else {
          country = await CountryModel.findOne({
            $or: [{ code: data.countryId }, { iso2: data.countryId }, { iso3: data.countryId }],
            isDeleted: false,
          });
        }
      } else if (data.countryCode) {
        country = await CountryModel.findOne({
          $or: [{ code: data.countryCode }, { iso2: data.countryCode }, { iso3: data.countryCode }],
          isDeleted: false,
        });
      }

      if (!country) {
        throw new ApiError(400, 'Country not found');
      }
    } else {
      // Use existing country (excluding soft-deleted)
      country = await CountryModel.findOne({
        $or: [{ _id: existingState.countryId }, { code: existingState.countryCode }, { iso2: existingState.countryCode }],
        isDeleted: false,
      });
    }

    // Check for duplicates if name is being updated (excluding soft-deleted)
    if (data.name) {
      const duplicateState = await StateModel.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        $or: [{ countryId: country._id.toString() }, { countryCode: country.code || country.iso2 }],
        _id: { $ne: existingState._id },
        isDeleted: false,
      });

      if (duplicateState) {
        throw new ApiError(400, 'State with this name already exists in this country');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.countryId !== undefined || data.countryCode !== undefined) {
      updateData.countryId = country._id.toString();
      updateData.countryCode = country.code || country.iso2 || null;
      updateData.countryName = country.name;
    }
    if (data.stateCode !== undefined) updateData.stateCode = data.stateCode?.trim() || null;
    if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude || null;

    const updatedState = await StateModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();

    return updatedState as State | null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update state:', error);
    throw new ApiError(500, 'Failed to update state');
  }
};

/**
 * Delete state (soft delete with cascade)
 * Soft deletes the state and all associated cities
 */
export const deleteState = async (id: string): Promise<void> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { stateCode: id, isDeleted: false };
    }

    const state = await StateModel.findOne(query);
    if (!state) {
      throw new ApiError(404, 'State not found');
    }

    const stateId = state._id.toString();
    const stateName = state.name;
    const now = new Date();

    // Soft delete all associated cities (cascade)
    const citiesResult = await CityModel.updateMany(
      {
        $or: [{ stateId: stateId }, { stateName: stateName }],
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      }
    );

    // Soft delete the state
    await StateModel.updateOne(query, {
      $set: {
        isDeleted: true,
        deletedAt: now,
      },
    });

    logger.info(`State soft deleted: ${id}`, {
      citiesDeleted: citiesResult.modifiedCount,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete state:', error);
    throw new ApiError(500, 'Failed to delete state');
  }
};

// ==================== CITY MANAGEMENT ====================

export interface GetAdminCitiesParams extends GetAdminLocationsParams {
  stateId?: string;
  stateName?: string;
  countryId?: string;
  countryCode?: string;
}

/**
 * Get all cities for admin with filters and pagination
 */
export const getAllCities = async (params: GetAdminCitiesParams = {}): Promise<AdminPaginatedResult<City>> => {
  try {
    const query: any = { isDeleted: false };

    // Filter by state if provided
    if (params.stateId) {
      if (Types.ObjectId.isValid(params.stateId)) {
        const state = await StateModel.findOne({ _id: params.stateId, isDeleted: false });
        if (state) {
          query.$or = [{ stateId: params.stateId }, { stateName: state.name }];
        } else {
          query.stateId = params.stateId;
        }
      } else {
        query.stateId = params.stateId;
      }
    }

    if (params.stateName) {
      query.stateName = { $regex: new RegExp(params.stateName, 'i') };
    }

    // Filter by country if provided
    if (params.countryId || params.countryCode) {
      const countryQuery: any = {};
      if (params.countryId) {
        if (Types.ObjectId.isValid(params.countryId)) {
          const country = await CountryModel.findOne({ _id: params.countryId, isDeleted: false });
          if (country) {
            countryQuery.$or = [
              { countryId: params.countryId },
              { countryCode: country.code || country.iso2 },
            ];
          } else {
            countryQuery.countryId = params.countryId;
          }
        } else {
          countryQuery.countryId = params.countryId;
        }
      }
      if (params.countryCode) {
        countryQuery.countryCode = params.countryCode;
      }
      Object.assign(query, countryQuery);
    }

    // Search by name, stateName, countryName
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { name: searchRegex },
        { stateName: searchRegex },
        { countryName: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'name';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await CityModel.countDocuments(query);

    // Get cities
    const cities = await CityModel.find(query).sort(sort).skip(skip).limit(limit).lean();

    const totalPages = Math.ceil(total / limit);

    return {
      items: cities as City[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch cities for admin:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get city by ID
 */
export const getCityById = async (id: string): Promise<City | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { name: id, isDeleted: false };
    }

    const city = await CityModel.findOne(query).lean();
    return city as City | null;
  } catch (error) {
    logger.error('Failed to fetch city by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create a new city
 */
export const createCity = async (data: CreateCityInput): Promise<City> => {
  try {
    // Validate state exists (excluding soft-deleted)
    let state: any = null;
    if (data.stateId) {
      if (Types.ObjectId.isValid(data.stateId)) {
        state = await StateModel.findOne({ _id: data.stateId, isDeleted: false });
      } else {
        state = await StateModel.findOne({ stateCode: data.stateId, isDeleted: false });
      }
    } else if (data.stateName) {
      state = await StateModel.findOne({ name: { $regex: new RegExp(`^${data.stateName.trim()}$`, 'i') }, isDeleted: false });
    }

    if (!state) {
      throw new ApiError(400, 'State not found');
    }

    // Get country info from state (excluding soft-deleted)
    let country: any = null;
    if (state.countryId) {
      country = await CountryModel.findOne({ _id: state.countryId, isDeleted: false });
    } else if (state.countryCode) {
      country = await CountryModel.findOne({
        $or: [{ code: state.countryCode }, { iso2: state.countryCode }, { iso3: state.countryCode }],
        isDeleted: false,
      });
    }

    // Check if city with same name in same state already exists (excluding soft-deleted)
    const existingCity = await CityModel.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
      $or: [{ stateId: state._id.toString() }, { stateName: state.name }],
      isDeleted: false,
    });

    if (existingCity) {
      throw new ApiError(400, 'City with this name already exists in this state');
    }

    const city = new CityModel({
      name: data.name.trim(),
      stateId: state._id.toString(),
      stateName: state.name,
      stateCode: state.stateCode || null,
      countryId: country?._id.toString() || null,
      countryCode: country?.code || country?.iso2 || null,
      countryName: country?.name || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    });

    await city.save();
    return city.toObject();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create city:', error);
    throw new ApiError(500, 'Failed to create city');
  }
};

/**
 * Update city
 */
export const updateCity = async (id: string, data: UpdateCityInput): Promise<City | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { name: id, isDeleted: false };
    }

    const existingCity = await CityModel.findOne(query);
    if (!existingCity) {
      throw new ApiError(404, 'City not found');
    }

    // Validate state if being updated (excluding soft-deleted)
    let state: any = null;
    if (data.stateId || data.stateName) {
      if (data.stateId) {
        if (Types.ObjectId.isValid(data.stateId)) {
          state = await StateModel.findOne({ _id: data.stateId, isDeleted: false });
        } else {
          state = await StateModel.findOne({ stateCode: data.stateId, isDeleted: false });
        }
      } else if (data.stateName) {
        state = await StateModel.findOne({ name: { $regex: new RegExp(`^${data.stateName.trim()}$`, 'i') }, isDeleted: false });
      }

      if (!state) {
        throw new ApiError(400, 'State not found');
      }
    } else {
      // Use existing state (excluding soft-deleted)
      if (existingCity.stateId) {
        state = await StateModel.findOne({ _id: existingCity.stateId, isDeleted: false });
      } else if (existingCity.stateName) {
        state = await StateModel.findOne({ name: { $regex: new RegExp(`^${existingCity.stateName}$`, 'i') }, isDeleted: false });
      }
    }

    if (!state) {
      throw new ApiError(400, 'State information not found');
    }

    // Get country info from state (excluding soft-deleted)
    let country: any = null;
    if (state.countryId) {
      country = await CountryModel.findOne({ _id: state.countryId, isDeleted: false });
    } else if (state.countryCode) {
      country = await CountryModel.findOne({
        $or: [{ code: state.countryCode }, { iso2: state.countryCode }, { iso3: state.countryCode }],
        isDeleted: false,
      });
    }

    // Check for duplicates if name is being updated (excluding soft-deleted)
    if (data.name) {
      const duplicateCity = await CityModel.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        $or: [{ stateId: state._id.toString() }, { stateName: state.name }],
        _id: { $ne: existingCity._id },
        isDeleted: false,
      });

      if (duplicateCity) {
        throw new ApiError(400, 'City with this name already exists in this state');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.stateId !== undefined || data.stateName !== undefined) {
      updateData.stateId = state._id.toString();
      updateData.stateName = state.name;
      updateData.stateCode = state.stateCode || null;
      if (country) {
        updateData.countryId = country._id.toString();
        updateData.countryCode = country.code || country.iso2 || null;
        updateData.countryName = country.name;
      }
    }
    if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude || null;

    const updatedCity = await CityModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();

    return updatedCity as City | null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update city:', error);
    throw new ApiError(500, 'Failed to update city');
  }
};

/**
 * Delete city (soft delete)
 */
export const deleteCity = async (id: string): Promise<void> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id), isDeleted: false };
    } else {
      query = { name: id, isDeleted: false };
    }

    const city = await CityModel.findOne(query);
    if (!city) {
      throw new ApiError(404, 'City not found');
    }

    // Soft delete the city
    await CityModel.updateOne(query, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(`City soft deleted: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete city:', error);
    throw new ApiError(500, 'Failed to delete city');
  }
};

