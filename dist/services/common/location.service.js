"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopCities = exports.getCitiesByStateId = exports.getCitiesByState = exports.getStatesByCountry = exports.getAllCountries = void 0;
const location_model_1 = require("../../models/location.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const logger_1 = require("../../utils/logger");
const locationCache_1 = require("../../utils/locationCache");
const mongoose_1 = require("mongoose");
const getAllCountries = async () => {
    try {
        // Check cache first
        const cached = await (0, locationCache_1.getCachedCountries)();
        if (cached) {
            return cached;
        }
        // Fetch from database
        const countries = await location_model_1.CountryModel.find({ isDeleted: false })
            .select('name code iso2 iso3 phoneCode currency currencySymbol region subregion latitude longitude')
            .sort({ name: 1 })
            .lean();
        // Cache the result
        if (countries.length > 0) {
            await (0, locationCache_1.cacheCountries)(countries);
        }
        return countries;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch countries', error);
        throw error;
    }
};
exports.getAllCountries = getAllCountries;
const getStatesByCountry = async (countryCode) => {
    try {
        const trimmedCountryCode = countryCode.trim();
        // Check cache first
        const cached = await (0, locationCache_1.getCachedStates)(trimmedCountryCode);
        if (cached) {
            return cached;
        }
        // Optimized query with compound index support
        // Try countryCode first (most common), then countryId
        const query = {
            isDeleted: false,
        };
        // Check if it's a valid MongoDB ObjectId
        if (mongoose_1.Types.ObjectId.isValid(trimmedCountryCode)) {
            query.$or = [
                { countryCode: trimmedCountryCode },
                { countryId: trimmedCountryCode },
                { _id: new mongoose_1.Types.ObjectId(trimmedCountryCode) },
            ];
        }
        else {
            query.$or = [{ countryCode: trimmedCountryCode }, { countryId: trimmedCountryCode }];
        }
        // Fetch from database
        const states = await location_model_1.StateModel.find(query)
            .select('name countryId countryCode countryName stateCode latitude longitude')
            .sort({ name: 1 })
            .lean();
        // Cache the result
        if (states.length > 0) {
            await (0, locationCache_1.cacheStates)(trimmedCountryCode, states);
        }
        return states;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch states', { countryCode, error });
        throw error;
    }
};
exports.getStatesByCountry = getStatesByCountry;
const getCitiesByState = async (stateName, countryCode) => {
    try {
        // Decode URL encoding, trim, and normalize spaces
        const normalizedStateName = decodeURIComponent(stateName)
            .trim()
            .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
        // Escape special regex characters
        const escapedStateName = normalizedStateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = {
            stateName: {
                $regex: new RegExp(`^${escapedStateName}$`, 'i')
            },
            isDeleted: false,
        };
        if (countryCode) {
            query.countryCode = countryCode.trim();
        }
        let cities = await location_model_1.CityModel.find(query)
            .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
            .sort({ name: 1 })
            .lean();
        // If no results with exact match, try case-insensitive partial match
        if (cities.length === 0) {
            const partialQuery = {
                stateName: { $regex: new RegExp(escapedStateName, 'i') },
                isDeleted: false,
            };
            if (countryCode) {
                partialQuery.countryCode = countryCode.trim();
            }
            cities = await location_model_1.CityModel.find(partialQuery)
                .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
                .sort({ name: 1 })
                .lean();
        }
        // Transform to nested structure
        return cities.map((city) => {
            const result = {
                _id: city._id?.toString(),
                name: city.name,
            };
            // Add state object if state info exists
            if (city.stateId || city.stateName || city.stateCode) {
                result.state = {};
                if (city.stateId)
                    result.state.id = city.stateId;
                if (city.stateName)
                    result.state.name = city.stateName;
                if (city.stateCode)
                    result.state.code = city.stateCode;
            }
            // Add country object if country info exists
            if (city.countryId || city.countryName || city.countryCode) {
                result.country = {};
                if (city.countryId)
                    result.country.id = city.countryId;
                if (city.countryName)
                    result.country.name = city.countryName;
                if (city.countryCode)
                    result.country.code = city.countryCode;
            }
            // Add coordinates if they exist
            if (city.latitude !== undefined && city.latitude !== null) {
                result.latitude = city.latitude;
            }
            if (city.longitude !== undefined && city.longitude !== null) {
                result.longitude = city.longitude;
            }
            return result;
        }).filter(city => city.state && (city.state.id || city.state.name)); // Only include cities with state info
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch cities', { stateName, countryCode, error });
        throw error;
    }
};
exports.getCitiesByState = getCitiesByState;
const getCitiesByStateId = async (stateId) => {
    try {
        const trimmedStateId = stateId.trim();
        // Check cache first
        const cached = await (0, locationCache_1.getCachedCities)(trimmedStateId);
        if (cached) {
            return cached;
        }
        // Optimized query using aggregation for better performance
        // This reduces multiple queries to a single aggregation pipeline
        const isObjectId = mongoose_1.Types.ObjectId.isValid(trimmedStateId);
        let query = {
            isDeleted: false,
        };
        // Build optimized query - try multiple approaches in single query
        if (isObjectId) {
            // If it's a valid ObjectId, try all possible matches
            query.$or = [
                { stateId: trimmedStateId },
                { _id: new mongoose_1.Types.ObjectId(trimmedStateId) },
            ];
        }
        else {
            query.stateId = trimmedStateId;
        }
        // First attempt: query by stateId
        let cities = await location_model_1.CityModel.find(query)
            .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
            .sort({ name: 1 })
            .lean();
        // If no results and it's an ObjectId, try to find state and query by stateName
        if (cities.length === 0 && isObjectId) {
            const state = await location_model_1.StateModel.findOne({ _id: new mongoose_1.Types.ObjectId(trimmedStateId), isDeleted: false })
                .select('_id name')
                .lean();
            if (state) {
                // Query cities by stateName
                cities = await location_model_1.CityModel.find({
                    stateName: state.name,
                    isDeleted: false,
                })
                    .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
                    .sort({ name: 1 })
                    .lean();
            }
        }
        // Transform to nested structure
        const transformedCities = cities
            .map((city) => {
            const result = {
                _id: city._id?.toString(),
                name: city.name,
            };
            // Add state object if state info exists
            if (city.stateId || city.stateName || city.stateCode) {
                result.state = {};
                if (city.stateId)
                    result.state.id = city.stateId;
                if (city.stateName)
                    result.state.name = city.stateName;
                if (city.stateCode)
                    result.state.code = city.stateCode;
            }
            // Add country object if country info exists
            if (city.countryId || city.countryName || city.countryCode) {
                result.country = {};
                if (city.countryId)
                    result.country.id = city.countryId;
                if (city.countryName)
                    result.country.name = city.countryName;
                if (city.countryCode)
                    result.country.code = city.countryCode;
            }
            // Add coordinates if they exist
            if (city.latitude !== undefined && city.latitude !== null) {
                result.latitude = city.latitude;
            }
            if (city.longitude !== undefined && city.longitude !== null) {
                result.longitude = city.longitude;
            }
            return result;
        })
            .filter((city) => city.state && (city.state.id || city.state.name)); // Only include cities with state info
        // Cache the result
        if (transformedCities.length > 0) {
            await (0, locationCache_1.cacheCities)(trimmedStateId, transformedCities);
        }
        return transformedCities;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch cities by state ID', { stateId, error });
        throw error;
    }
};
exports.getCitiesByStateId = getCitiesByStateId;
const getTopCities = async (limit = 15) => {
    try {
        // Aggregate coaching centers by city
        // Only count active, non-deleted, published centers
        const cityStats = await coachingCenter_model_1.CoachingCenterModel.aggregate([
            {
                $match: {
                    is_deleted: false,
                    is_active: true,
                    status: 'published',
                    $and: [
                        { 'location.address.city': { $exists: true } },
                        { 'location.address.city': { $ne: null } },
                        { 'location.address.city': { $ne: '' } },
                    ],
                },
            },
            {
                $unwind: {
                    path: '$sports',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: {
                        cityLower: { $toLower: '$location.address.city' }, // Case-insensitive city grouping
                        stateLower: { $toLower: { $ifNull: ['$location.address.state', ''] } } // Case-insensitive state grouping
                    },
                    city: { $first: '$location.address.city' }, // Keep original case
                    state: { $first: { $ifNull: ['$location.address.state', ''] } }, // Keep original state case
                    academyIds: { $addToSet: '$_id' }, // Unique academy IDs
                    uniqueSportIds: { $addToSet: '$sports' }, // Unique sport IDs
                },
            },
            {
                $project: {
                    city: 1,
                    state: 1,
                    academyCount: { $size: '$academyIds' },
                    sportsCount: {
                        $size: {
                            $filter: {
                                input: '$uniqueSportIds',
                                as: 'sportId',
                                cond: { $ne: ['$$sportId', null] },
                            },
                        },
                    },
                },
            },
            {
                $sort: { academyCount: -1, city: 1 }, // Sort by academy count descending, then city name
            },
            {
                $limit: limit,
            },
        ]);
        return cityStats.map((stat) => ({
            city: stat.city,
            state: stat.state || '',
            academyCount: stat.academyCount,
            sportsCount: stat.sportsCount,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch top cities', { error });
        throw error;
    }
};
exports.getTopCities = getTopCities;
//# sourceMappingURL=location.service.js.map