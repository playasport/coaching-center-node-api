import { CountryModel, StateModel, CityModel, Country, State, City } from '../models/location.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { logger } from '../utils/logger';

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

export const getCitiesByState = async (stateName: string, countryCode?: string): Promise<City[]> => {
  try {
    const query: any = { stateName: { $regex: new RegExp(`^${stateName}$`, 'i') } };
    
    if (countryCode) {
      query.countryCode = countryCode;
    }

    const cities = await CityModel.find(query)
      .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
      .sort({ name: 1 })
      .lean();
    return cities as City[];
  } catch (error) {
    logger.error('Failed to fetch cities', { stateName, countryCode, error });
    throw error;
  }
};

export const getCitiesByStateId = async (stateId: string): Promise<City[]> => {
  try {
    const cities = await CityModel.find({ stateId })
      .select('name stateId stateName stateCode countryId countryCode countryName latitude longitude')
      .sort({ name: 1 })
      .lean();
    return cities as City[];
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

