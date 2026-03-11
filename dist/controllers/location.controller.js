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
exports.getTopCities = exports.getCities = exports.getStates = exports.getCountries = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const locationService = __importStar(require("../services/common/location.service"));
const getCountries = async (_req, res, next) => {
    try {
        const countries = await locationService.getAllCountries();
        const response = new ApiResponse_1.ApiResponse(200, { countries }, (0, i18n_1.t)('location.countries.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCountries = getCountries;
const getStates = async (req, res, next) => {
    try {
        const { countryCode } = req.query;
        if (!countryCode || typeof countryCode !== 'string') {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('location.states.countryCodeRequired'));
        }
        // Validate countryCode length
        if (countryCode.length > 50) {
            throw new ApiError_1.ApiError(400, 'Country code is too long');
        }
        const states = await locationService.getStatesByCountry(countryCode);
        const response = new ApiResponse_1.ApiResponse(200, { states }, (0, i18n_1.t)('location.states.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getStates = getStates;
const getCities = async (req, res, next) => {
    try {
        const { stateId } = req.query;
        if (!stateId || typeof stateId !== 'string') {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('location.cities.stateRequired'));
        }
        // Validate stateId length
        if (stateId.length > 100) {
            throw new ApiError_1.ApiError(400, 'State ID is too long');
        }
        const cities = await locationService.getCitiesByStateId(stateId);
        const response = new ApiResponse_1.ApiResponse(200, { cities }, (0, i18n_1.t)('location.cities.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCities = getCities;
const getTopCities = async (_req, res, next) => {
    try {
        const topCities = await locationService.getTopCities(15);
        const response = new ApiResponse_1.ApiResponse(200, { cities: topCities }, 'Top cities retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getTopCities = getTopCities;
//# sourceMappingURL=location.controller.js.map