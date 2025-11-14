import { CountryModel, StateModel, CityModel, Country, State, City } from '../models/location.model';
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

