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
exports.deleteCity = exports.updateCity = exports.createCity = exports.getCityById = exports.getAllCities = exports.deleteState = exports.updateState = exports.createState = exports.getStateById = exports.getAllStates = exports.deleteCountry = exports.updateCountry = exports.createCountry = exports.getCountryById = exports.getAllCountries = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminLocationService = __importStar(require("../../services/admin/location.service"));
// ==================== COUNTRY CONTROLLERS ====================
/**
 * Get all countries for admin
 */
const getAllCountries = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { search, region, subregion, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            search: search,
            region: region,
            subregion: subregion,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminLocationService.getAllCountries(params);
        const response = new ApiResponse_1.ApiResponse(200, { countries: result.items, pagination: result.pagination }, 'Countries retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCountries = getAllCountries;
/**
 * Get country by ID for admin
 */
const getCountryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const country = await adminLocationService.getCountryById(id);
        if (!country) {
            throw new ApiError_1.ApiError(404, 'Country not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { country }, 'Country retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCountryById = getCountryById;
/**
 * Create new country
 */
const createCountry = async (req, res, next) => {
    try {
        const data = req.body;
        const country = await adminLocationService.createCountry(data);
        const response = new ApiResponse_1.ApiResponse(201, { country }, 'Country created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCountry = createCountry;
/**
 * Update country by admin
 */
const updateCountry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const country = await adminLocationService.updateCountry(id, data);
        if (!country) {
            throw new ApiError_1.ApiError(404, 'Country not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { country }, 'Country updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCountry = updateCountry;
/**
 * Delete country
 */
const deleteCountry = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminLocationService.deleteCountry(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Country deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCountry = deleteCountry;
// ==================== STATE CONTROLLERS ====================
/**
 * Get all states for admin
 */
const getAllStates = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { search, countryId, countryCode, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            search: search,
            countryId: countryId,
            countryCode: countryCode,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminLocationService.getAllStates(params);
        const response = new ApiResponse_1.ApiResponse(200, { states: result.items, pagination: result.pagination }, 'States retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllStates = getAllStates;
/**
 * Get state by ID for admin
 */
const getStateById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const state = await adminLocationService.getStateById(id);
        if (!state) {
            throw new ApiError_1.ApiError(404, 'State not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { state }, 'State retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getStateById = getStateById;
/**
 * Create new state
 */
const createState = async (req, res, next) => {
    try {
        const data = req.body;
        const state = await adminLocationService.createState(data);
        const response = new ApiResponse_1.ApiResponse(201, { state }, 'State created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createState = createState;
/**
 * Update state by admin
 */
const updateState = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const state = await adminLocationService.updateState(id, data);
        if (!state) {
            throw new ApiError_1.ApiError(404, 'State not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { state }, 'State updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateState = updateState;
/**
 * Delete state
 */
const deleteState = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminLocationService.deleteState(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'State deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteState = deleteState;
// ==================== CITY CONTROLLERS ====================
/**
 * Get all cities for admin
 */
const getAllCities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { search, stateId, stateName, countryId, countryCode, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            search: search,
            stateId: stateId,
            stateName: stateName,
            countryId: countryId,
            countryCode: countryCode,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminLocationService.getAllCities(params);
        const response = new ApiResponse_1.ApiResponse(200, { cities: result.items, pagination: result.pagination }, 'Cities retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCities = getAllCities;
/**
 * Get city by ID for admin
 */
const getCityById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const city = await adminLocationService.getCityById(id);
        if (!city) {
            throw new ApiError_1.ApiError(404, 'City not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { city }, 'City retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCityById = getCityById;
/**
 * Create new city
 */
const createCity = async (req, res, next) => {
    try {
        const data = req.body;
        const city = await adminLocationService.createCity(data);
        const response = new ApiResponse_1.ApiResponse(201, { city }, 'City created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCity = createCity;
/**
 * Update city by admin
 */
const updateCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const city = await adminLocationService.updateCity(id, data);
        if (!city) {
            throw new ApiError_1.ApiError(404, 'City not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { city }, 'City updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCity = updateCity;
/**
 * Delete city
 */
const deleteCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminLocationService.deleteCity(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'City deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCity = deleteCity;
//# sourceMappingURL=location.controller.js.map