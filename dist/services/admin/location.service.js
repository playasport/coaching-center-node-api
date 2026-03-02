"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCity = exports.updateCity = exports.createCity = exports.getCityById = exports.getAllCities = exports.deleteState = exports.updateState = exports.createState = exports.getStateById = exports.getAllStates = exports.deleteCountry = exports.updateCountry = exports.createCountry = exports.getCountryById = exports.getAllCountries = void 0;
const location_model_1 = require("../../models/location.model");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
/**
 * Get all countries for admin with filters and pagination
 */
const getAllCountries = async (params = {}) => {
    try {
        const query = { isDeleted: false };
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
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await location_model_1.CountryModel.countDocuments(query);
        // Get countries
        const countries = await location_model_1.CountryModel.find(query).sort(sort).skip(skip).limit(limit).lean();
        const totalPages = Math.ceil(total / limit);
        return {
            items: countries,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch countries for admin:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllCountries = getAllCountries;
/**
 * Get country by ID
 */
const getCountryById = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
        }
        const country = await location_model_1.CountryModel.findOne(query).lean();
        return country;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch country by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCountryById = getCountryById;
/**
 * Create a new country
 */
const createCountry = async (data) => {
    try {
        // Check if country with same name or code already exists (excluding soft-deleted)
        const existingCountry = await location_model_1.CountryModel.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } },
                ...(data.code ? [{ code: data.code.trim() }] : []),
                ...(data.iso2 ? [{ iso2: data.iso2.trim().toUpperCase() }] : []),
            ],
            isDeleted: false,
        });
        if (existingCountry) {
            throw new ApiError_1.ApiError(400, 'Country with this name or code already exists');
        }
        const country = new location_model_1.CountryModel({
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create country:', error);
        throw new ApiError_1.ApiError(500, 'Failed to create country');
    }
};
exports.createCountry = createCountry;
/**
 * Update country
 */
const updateCountry = async (id, data) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
        }
        const existingCountry = await location_model_1.CountryModel.findOne(query);
        if (!existingCountry) {
            throw new ApiError_1.ApiError(404, 'Country not found');
        }
        // Check for duplicates if name or code is being updated (excluding soft-deleted)
        if (data.name || data.code || data.iso2) {
            const duplicateQuery = { _id: { $ne: existingCountry._id }, isDeleted: false };
            const orConditions = [];
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
                const duplicate = await location_model_1.CountryModel.findOne(duplicateQuery);
                if (duplicate) {
                    throw new ApiError_1.ApiError(400, 'Country with this name or code already exists');
                }
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.code !== undefined)
            updateData.code = data.code?.trim() || null;
        if (data.iso2 !== undefined)
            updateData.iso2 = data.iso2?.trim().toUpperCase() || null;
        if (data.iso3 !== undefined)
            updateData.iso3 = data.iso3?.trim().toUpperCase() || null;
        if (data.phoneCode !== undefined)
            updateData.phoneCode = data.phoneCode?.trim() || null;
        if (data.currency !== undefined)
            updateData.currency = data.currency?.trim() || null;
        if (data.currencySymbol !== undefined)
            updateData.currencySymbol = data.currencySymbol?.trim() || null;
        if (data.region !== undefined)
            updateData.region = data.region?.trim() || null;
        if (data.subregion !== undefined)
            updateData.subregion = data.subregion?.trim() || null;
        if (data.latitude !== undefined)
            updateData.latitude = data.latitude || null;
        if (data.longitude !== undefined)
            updateData.longitude = data.longitude || null;
        const updatedCountry = await location_model_1.CountryModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();
        return updatedCountry;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update country:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update country');
    }
};
exports.updateCountry = updateCountry;
/**
 * Delete country (soft delete with cascade)
 * Soft deletes the country and all associated states and cities
 */
const deleteCountry = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { $or: [{ code: id }, { iso2: id }, { iso3: id }], isDeleted: false };
        }
        const country = await location_model_1.CountryModel.findOne(query);
        if (!country) {
            throw new ApiError_1.ApiError(404, 'Country not found');
        }
        const countryId = country._id.toString();
        const countryCode = country.code || country.iso2;
        const now = new Date();
        // Soft delete all associated states (cascade)
        const statesResult = await location_model_1.StateModel.updateMany({
            $or: [{ countryId: countryId }, { countryCode: countryCode }],
            isDeleted: false,
        }, {
            $set: {
                isDeleted: true,
                deletedAt: now,
            },
        });
        // Soft delete all associated cities (cascade)
        const citiesResult = await location_model_1.CityModel.updateMany({
            $or: [{ countryId: countryId }, { countryCode: countryCode }],
            isDeleted: false,
        }, {
            $set: {
                isDeleted: true,
                deletedAt: now,
            },
        });
        // Soft delete the country
        await location_model_1.CountryModel.updateOne(query, {
            $set: {
                isDeleted: true,
                deletedAt: now,
            },
        });
        logger_1.logger.info(`Country soft deleted: ${id}`, {
            statesDeleted: statesResult.modifiedCount,
            citiesDeleted: citiesResult.modifiedCount,
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete country:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete country');
    }
};
exports.deleteCountry = deleteCountry;
/**
 * Get all states for admin with filters and pagination
 */
const getAllStates = async (params = {}) => {
    try {
        const query = { isDeleted: false };
        // Filter by country if provided
        if (params.countryId || params.countryCode) {
            const countryQuery = {};
            if (params.countryId) {
                if (mongoose_1.Types.ObjectId.isValid(params.countryId)) {
                    countryQuery.countryId = params.countryId;
                }
                else {
                    // Try to find country by code/iso2/iso3 (excluding soft-deleted)
                    const country = await location_model_1.CountryModel.findOne({
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
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await location_model_1.StateModel.countDocuments(query);
        // Get states
        const states = await location_model_1.StateModel.find(query).sort(sort).skip(skip).limit(limit).lean();
        const totalPages = Math.ceil(total / limit);
        return {
            items: states,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch states for admin:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllStates = getAllStates;
/**
 * Get state by ID
 */
const getStateById = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { stateCode: id, isDeleted: false };
        }
        const state = await location_model_1.StateModel.findOne(query).lean();
        return state;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch state by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getStateById = getStateById;
/**
 * Create a new state
 */
const createState = async (data) => {
    try {
        // Validate country exists (excluding soft-deleted)
        let country = null;
        if (data.countryId) {
            if (mongoose_1.Types.ObjectId.isValid(data.countryId)) {
                country = await location_model_1.CountryModel.findOne({ _id: data.countryId, isDeleted: false });
            }
            else {
                country = await location_model_1.CountryModel.findOne({
                    $or: [{ code: data.countryId }, { iso2: data.countryId }, { iso3: data.countryId }],
                    isDeleted: false,
                });
            }
        }
        else if (data.countryCode) {
            country = await location_model_1.CountryModel.findOne({
                $or: [{ code: data.countryCode }, { iso2: data.countryCode }, { iso3: data.countryCode }],
                isDeleted: false,
            });
        }
        if (!country) {
            throw new ApiError_1.ApiError(400, 'Country not found');
        }
        // Check if state with same name in same country already exists (excluding soft-deleted)
        const existingState = await location_model_1.StateModel.findOne({
            name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
            $or: [{ countryId: country._id.toString() }, { countryCode: country.code || country.iso2 }],
            isDeleted: false,
        });
        if (existingState) {
            throw new ApiError_1.ApiError(400, 'State with this name already exists in this country');
        }
        const state = new location_model_1.StateModel({
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create state:', error);
        throw new ApiError_1.ApiError(500, 'Failed to create state');
    }
};
exports.createState = createState;
/**
 * Update state
 */
const updateState = async (id, data) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { stateCode: id, isDeleted: false };
        }
        const existingState = await location_model_1.StateModel.findOne(query);
        if (!existingState) {
            throw new ApiError_1.ApiError(404, 'State not found');
        }
        // Validate country if being updated (excluding soft-deleted)
        let country = null;
        if (data.countryId || data.countryCode) {
            if (data.countryId) {
                if (mongoose_1.Types.ObjectId.isValid(data.countryId)) {
                    country = await location_model_1.CountryModel.findOne({ _id: data.countryId, isDeleted: false });
                }
                else {
                    country = await location_model_1.CountryModel.findOne({
                        $or: [{ code: data.countryId }, { iso2: data.countryId }, { iso3: data.countryId }],
                        isDeleted: false,
                    });
                }
            }
            else if (data.countryCode) {
                country = await location_model_1.CountryModel.findOne({
                    $or: [{ code: data.countryCode }, { iso2: data.countryCode }, { iso3: data.countryCode }],
                    isDeleted: false,
                });
            }
            if (!country) {
                throw new ApiError_1.ApiError(400, 'Country not found');
            }
        }
        else {
            // Use existing country (excluding soft-deleted)
            country = await location_model_1.CountryModel.findOne({
                $or: [{ _id: existingState.countryId }, { code: existingState.countryCode }, { iso2: existingState.countryCode }],
                isDeleted: false,
            });
        }
        // Check for duplicates if name is being updated (excluding soft-deleted)
        if (data.name) {
            const duplicateState = await location_model_1.StateModel.findOne({
                name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
                $or: [{ countryId: country._id.toString() }, { countryCode: country.code || country.iso2 }],
                _id: { $ne: existingState._id },
                isDeleted: false,
            });
            if (duplicateState) {
                throw new ApiError_1.ApiError(400, 'State with this name already exists in this country');
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.countryId !== undefined || data.countryCode !== undefined) {
            updateData.countryId = country._id.toString();
            updateData.countryCode = country.code || country.iso2 || null;
            updateData.countryName = country.name;
        }
        if (data.stateCode !== undefined)
            updateData.stateCode = data.stateCode?.trim() || null;
        if (data.latitude !== undefined)
            updateData.latitude = data.latitude || null;
        if (data.longitude !== undefined)
            updateData.longitude = data.longitude || null;
        const updatedState = await location_model_1.StateModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();
        return updatedState;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update state:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update state');
    }
};
exports.updateState = updateState;
/**
 * Delete state (soft delete with cascade)
 * Soft deletes the state and all associated cities
 */
const deleteState = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { stateCode: id, isDeleted: false };
        }
        const state = await location_model_1.StateModel.findOne(query);
        if (!state) {
            throw new ApiError_1.ApiError(404, 'State not found');
        }
        const stateId = state._id.toString();
        const stateName = state.name;
        const now = new Date();
        // Soft delete all associated cities (cascade)
        const citiesResult = await location_model_1.CityModel.updateMany({
            $or: [{ stateId: stateId }, { stateName: stateName }],
            isDeleted: false,
        }, {
            $set: {
                isDeleted: true,
                deletedAt: now,
            },
        });
        // Soft delete the state
        await location_model_1.StateModel.updateOne(query, {
            $set: {
                isDeleted: true,
                deletedAt: now,
            },
        });
        logger_1.logger.info(`State soft deleted: ${id}`, {
            citiesDeleted: citiesResult.modifiedCount,
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete state:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete state');
    }
};
exports.deleteState = deleteState;
/**
 * Get all cities for admin with filters and pagination
 */
const getAllCities = async (params = {}) => {
    try {
        const query = { isDeleted: false };
        // Filter by state if provided
        if (params.stateId) {
            if (mongoose_1.Types.ObjectId.isValid(params.stateId)) {
                const state = await location_model_1.StateModel.findOne({ _id: params.stateId, isDeleted: false });
                if (state) {
                    query.$or = [{ stateId: params.stateId }, { stateName: state.name }];
                }
                else {
                    query.stateId = params.stateId;
                }
            }
            else {
                query.stateId = params.stateId;
            }
        }
        if (params.stateName) {
            query.stateName = { $regex: new RegExp(params.stateName, 'i') };
        }
        // Filter by country if provided
        if (params.countryId || params.countryCode) {
            const countryQuery = {};
            if (params.countryId) {
                if (mongoose_1.Types.ObjectId.isValid(params.countryId)) {
                    const country = await location_model_1.CountryModel.findOne({ _id: params.countryId, isDeleted: false });
                    if (country) {
                        countryQuery.$or = [
                            { countryId: params.countryId },
                            { countryCode: country.code || country.iso2 },
                        ];
                    }
                    else {
                        countryQuery.countryId = params.countryId;
                    }
                }
                else {
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
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await location_model_1.CityModel.countDocuments(query);
        // Get cities
        const cities = await location_model_1.CityModel.find(query).sort(sort).skip(skip).limit(limit).lean();
        const totalPages = Math.ceil(total / limit);
        return {
            items: cities,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch cities for admin:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllCities = getAllCities;
/**
 * Get city by ID
 */
const getCityById = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { name: id, isDeleted: false };
        }
        const city = await location_model_1.CityModel.findOne(query).lean();
        return city;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch city by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getCityById = getCityById;
/**
 * Create a new city
 */
const createCity = async (data) => {
    try {
        // Validate state exists (excluding soft-deleted)
        let state = null;
        if (data.stateId) {
            if (mongoose_1.Types.ObjectId.isValid(data.stateId)) {
                state = await location_model_1.StateModel.findOne({ _id: data.stateId, isDeleted: false });
            }
            else {
                state = await location_model_1.StateModel.findOne({ stateCode: data.stateId, isDeleted: false });
            }
        }
        else if (data.stateName) {
            state = await location_model_1.StateModel.findOne({ name: { $regex: new RegExp(`^${data.stateName.trim()}$`, 'i') }, isDeleted: false });
        }
        if (!state) {
            throw new ApiError_1.ApiError(400, 'State not found');
        }
        // Get country info from state (excluding soft-deleted)
        let country = null;
        if (state.countryId) {
            country = await location_model_1.CountryModel.findOne({ _id: state.countryId, isDeleted: false });
        }
        else if (state.countryCode) {
            country = await location_model_1.CountryModel.findOne({
                $or: [{ code: state.countryCode }, { iso2: state.countryCode }, { iso3: state.countryCode }],
                isDeleted: false,
            });
        }
        // Check if city with same name in same state already exists (excluding soft-deleted)
        const existingCity = await location_model_1.CityModel.findOne({
            name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
            $or: [{ stateId: state._id.toString() }, { stateName: state.name }],
            isDeleted: false,
        });
        if (existingCity) {
            throw new ApiError_1.ApiError(400, 'City with this name already exists in this state');
        }
        const city = new location_model_1.CityModel({
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create city:', error);
        throw new ApiError_1.ApiError(500, 'Failed to create city');
    }
};
exports.createCity = createCity;
/**
 * Update city
 */
const updateCity = async (id, data) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { name: id, isDeleted: false };
        }
        const existingCity = await location_model_1.CityModel.findOne(query);
        if (!existingCity) {
            throw new ApiError_1.ApiError(404, 'City not found');
        }
        // Validate state if being updated (excluding soft-deleted)
        let state = null;
        if (data.stateId || data.stateName) {
            if (data.stateId) {
                if (mongoose_1.Types.ObjectId.isValid(data.stateId)) {
                    state = await location_model_1.StateModel.findOne({ _id: data.stateId, isDeleted: false });
                }
                else {
                    state = await location_model_1.StateModel.findOne({ stateCode: data.stateId, isDeleted: false });
                }
            }
            else if (data.stateName) {
                state = await location_model_1.StateModel.findOne({ name: { $regex: new RegExp(`^${data.stateName.trim()}$`, 'i') }, isDeleted: false });
            }
            if (!state) {
                throw new ApiError_1.ApiError(400, 'State not found');
            }
        }
        else {
            // Use existing state (excluding soft-deleted)
            if (existingCity.stateId) {
                state = await location_model_1.StateModel.findOne({ _id: existingCity.stateId, isDeleted: false });
            }
            else if (existingCity.stateName) {
                state = await location_model_1.StateModel.findOne({ name: { $regex: new RegExp(`^${existingCity.stateName}$`, 'i') }, isDeleted: false });
            }
        }
        if (!state) {
            throw new ApiError_1.ApiError(400, 'State information not found');
        }
        // Get country info from state (excluding soft-deleted)
        let country = null;
        if (state.countryId) {
            country = await location_model_1.CountryModel.findOne({ _id: state.countryId, isDeleted: false });
        }
        else if (state.countryCode) {
            country = await location_model_1.CountryModel.findOne({
                $or: [{ code: state.countryCode }, { iso2: state.countryCode }, { iso3: state.countryCode }],
                isDeleted: false,
            });
        }
        // Check for duplicates if name is being updated (excluding soft-deleted)
        if (data.name) {
            const duplicateCity = await location_model_1.CityModel.findOne({
                name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
                $or: [{ stateId: state._id.toString() }, { stateName: state.name }],
                _id: { $ne: existingCity._id },
                isDeleted: false,
            });
            if (duplicateCity) {
                throw new ApiError_1.ApiError(400, 'City with this name already exists in this state');
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
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
        if (data.latitude !== undefined)
            updateData.latitude = data.latitude || null;
        if (data.longitude !== undefined)
            updateData.longitude = data.longitude || null;
        const updatedCity = await location_model_1.CityModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();
        return updatedCity;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update city:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update city');
    }
};
exports.updateCity = updateCity;
/**
 * Delete city (soft delete)
 */
const deleteCity = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id), isDeleted: false };
        }
        else {
            query = { name: id, isDeleted: false };
        }
        const city = await location_model_1.CityModel.findOne(query);
        if (!city) {
            throw new ApiError_1.ApiError(404, 'City not found');
        }
        // Soft delete the city
        await location_model_1.CityModel.updateOne(query, {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
        logger_1.logger.info(`City soft deleted: ${id}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete city:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete city');
    }
};
exports.deleteCity = deleteCity;
//# sourceMappingURL=location.service.js.map