import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { deleteFileFromS3, getS3Client } from '../common/s3.service';
import { SportModel } from '../../models/sport.model';
import { Types } from 'mongoose';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config/env';

/**
 * Generate a filename-safe slug from sport name
 */
const generateSportSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Upload sport image to S3 with sport name in filename (replaces old image automatically)
 */
export const uploadSportImage = async (
  sportId: string,
  file: Express.Multer.File
): Promise<string> => {
  try {
    // Find the sport
    const query = Types.ObjectId.isValid(sportId) ? { _id: sportId } : { custom_id: sportId };
    const sport = await SportModel.findOne(query);

    if (!sport) {
      throw new ApiError(404, 'Sport not found');
    }

    const client = getS3Client();
    if (!client) {
      throw new ApiError(500, 'S3 client not configured');
    }

    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    if (!file || !file.buffer) {
      throw new ApiError(400, 'File buffer is missing');
    }

    // Generate filename using sport slug or name (this ensures same filename = automatic replacement)
    const sportSlug = sport.slug || generateSportSlug(sport.name);
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `images/sports/${sportSlug}.${fileExtension}`;

    // Upload to S3 (will automatically replace if file with same name exists)
    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });

    await client.send(command);

    const imageUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`;

    // Update sport with new image URL
    await SportModel.findOneAndUpdate(query, { $set: { logo: imageUrl } });

    logger.info('Sport image uploaded successfully', { 
      sportId, 
      sportName: sport.name,
      sportSlug,
      fileName,
      imageUrl 
    });
    
    return imageUrl;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to upload sport image', { sportId, error });
    throw new ApiError(500, 'Failed to upload sport image');
  }
};

/**
 * Delete sport image
 */
export const deleteSportImage = async (sportId: string): Promise<void> => {
  try {
    const query = Types.ObjectId.isValid(sportId) ? { _id: sportId } : { custom_id: sportId };
    const sport = await SportModel.findOne(query);

    if (!sport) {
      throw new ApiError(404, 'Sport not found');
    }

    if (!sport.logo) {
      throw new ApiError(404, 'Sport image not found');
    }

    // Delete from S3
    await deleteFileFromS3(sport.logo);

    // Remove from sport document
    await SportModel.findOneAndUpdate(query, { $set: { logo: null } });

    logger.info('Sport image deleted successfully', { sportId });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete sport image', { sportId, error });
    throw new ApiError(500, 'Failed to delete sport image');
  }
};

