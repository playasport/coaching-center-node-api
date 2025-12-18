import { SportModel } from '../../models/sport.model';
import { logger } from '../../utils/logger';

export interface SportListItem {
  _id: string;
  custom_id: string;
  name: string;
  logo: string | null;
  is_popular: boolean;
}

export const getAllSports = async (): Promise<SportListItem[]> => {
  try {
    const sports = await SportModel.find({ is_active: true })
      .select('_id custom_id name logo is_popular')
      .sort({ is_popular: -1, name: 1 })
      .lean();
    
    return sports.map((sport) => ({
      _id: sport._id.toString(),
      custom_id: sport.custom_id,
      name: sport.name,
      logo: sport.logo || null,
      is_popular: sport.is_popular || false,
    })) as SportListItem[];
  } catch (error) {
    logger.error('Failed to fetch sports', error);
    throw error;
  }
};


