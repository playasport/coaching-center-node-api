import { CountryModel, StateModel, CityModel, Country, State } from '../../models/location.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';

export const getAllCountries = async (): Promise<Country[]> => {
  try {
    const countries = await CountryModel.find({})
      .select('name code iso2 iso3 phoneCode currency currencySymbol region subregion latitude longitude')
      .sort({ name: 1 })
      .lean();
    return countries as Country[];
  } catch (error) {
    logger.error('Failed to fetch countries', error);
    throw error;
  }
};

export const getStatesByCountry = async (countryCode: string): Promise<State[]> => {
  try {
    const states = await StateModel.find({
      $or: [{ countryCode: countryCode }, { countryId: countryCode }],
    })
      .select('name countryId countryCode countryName stateCode latitude longitude')
      .sort({ name: 1 })
      .lean();
    return states as State[];
  } catch (error) {
    logger.error('Failed to fetch states', { countryCode, error });
    throw error;
  }
};

export interface CityResponse {
  _id?: string;
  name: string;
  state?: {
    id?: string;
    name?: string;
    code?: string;
  };
  country?: {
    id?: string;
    name?: string;
    code?: string;
  };
  latitude?: number;
  longitude?: number;
}

export const getCitiesByState = async (stateName: string, countryCode?: string): Promise<CityResponse[]> => {
  try {
    // Decode URL encoding, trim, and normalize spaces
    const normalizedStateName = decodeURIComponent(stateName)
      .trim()
      .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
    
    // Escape special regex characters
    const escapedStateName = normalizedStateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const query: any = { 
      stateName: { 
        $regex: new RegExp(`^${escapedStateName}$`, 'i') 
      } 
    };
    
    if (countryCode) {
      query.countryCode = countryCode.trim();
    }

    let cities = await CityModel.find(query)
      .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
      .sort({ name: 1 })
      .lean();
    
    // If no results with exact match, try case-insensitive partial match
    if (cities.length === 0) {
      const partialQuery: any = {
        stateName: { $regex: new RegExp(escapedStateName, 'i') }
      };
      if (countryCode) {
        partialQuery.countryCode = countryCode.trim();
      }
      cities = await CityModel.find(partialQuery)
        .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
        .sort({ name: 1 })
        .lean();
    }
    
    // Transform to nested structure
    return cities.map((city: any) => {
      const result: CityResponse = {
        _id: city._id?.toString(),
        name: city.name,
      };

      // Add state object if state info exists
      if (city.stateId || city.stateName || city.stateCode) {
        result.state = {};
        if (city.stateId) result.state.id = city.stateId;
        if (city.stateName) result.state.name = city.stateName;
        if (city.stateCode) result.state.code = city.stateCode;
      }

      // Add country object if country info exists
      if (city.countryId || city.countryName || city.countryCode) {
        result.country = {};
        if (city.countryId) result.country.id = city.countryId;
        if (city.countryName) result.country.name = city.countryName;
        if (city.countryCode) result.country.code = city.countryCode;
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
  } catch (error) {
    logger.error('Failed to fetch cities', { stateName, countryCode, error });
    throw error;
  }
};

export const getCitiesByStateId = async (stateId: string): Promise<CityResponse[]> => {
  try {
    const trimmedStateId = stateId.trim();
    
    // First, try to find cities by stateId field directly
    let cities = await CityModel.find({ stateId: trimmedStateId })
      .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
      .sort({ name: 1 })
      .lean();
    
    // If no results, try to find state by MongoDB _id, then get its stateId value
    if (cities.length === 0) {
      const state = await StateModel.findById(trimmedStateId)
        .select('_id name')
        .lean();
      
      if (state) {
        // Try to find cities by stateName if we found the state
        cities = await CityModel.find({ stateName: state.name })
          .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
          .sort({ name: 1 })
          .lean();
      }
    }
    
    // Transform to nested structure
    return cities.map((city: any) => {
      const result: CityResponse = {
        _id: city._id?.toString(),
        name: city.name,
      };

      // Add state object if state info exists
      if (city.stateId || city.stateName || city.stateCode) {
        result.state = {};
        if (city.stateId) result.state.id = city.stateId;
        if (city.stateName) result.state.name = city.stateName;
        if (city.stateCode) result.state.code = city.stateCode;
      }

      // Add country object if country info exists
      if (city.countryId || city.countryName || city.countryCode) {
        result.country = {};
        if (city.countryId) result.country.id = city.countryId;
        if (city.countryName) result.country.name = city.countryName;
        if (city.countryCode) result.country.code = city.countryCode;
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
  } catch (error) {
    logger.error('Failed to fetch cities by state ID', { stateId, error });
    throw error;
  }
};

export interface TopCity {
  city: string;
  state: string;
  academyCount: number;
  sportsCount: number;
}

export const getTopCities = async (limit: number = 15): Promise<TopCity[]> => {
  try {
    // Aggregate coaching centers by city
    // Only count active, non-deleted, published centers
    const cityStats = await CoachingCenterModel.aggregate([
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
  } catch (error) {
    logger.error('Failed to fetch top cities', { error });
    throw error;
  }
};


