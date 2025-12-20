import { uploadFileToS3 } from '../common/s3.service';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';

/**
 * Upload banner image to S3
 * @param file - Multer file object
 * @param type - 'desktop' or 'mobile'
 * @returns S3 URL of uploaded image
 */
export const uploadBannerImage = async (
  file: Express.Multer.File,
  type: 'desktop' | 'mobile' = 'desktop'
): Promise<string> => {
  try {
    if (!file || !file.buffer) {
      throw new ApiError(400, 'File buffer is missing');
    }

    // Determine folder based on type
    const folder = type === 'mobile' ? 'banners/mobile' : 'banners/desktop';

    // Upload to S3
    const imageUrl = await uploadFileToS3({
      file,
      folder,
    });

    logger.info('Banner image uploaded to S3', {
      type,
      folder,
      size: `${(file.buffer.length / 1024).toFixed(2)} KB`,
      mimetype: file.mimetype,
    });

    return imageUrl;
  } catch (error) {
    logger.error('Failed to upload banner image', { type, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to upload banner image');
  }
};

/**
 * Upload both desktop and mobile banner images
 * @param desktopFile - Desktop banner image
 * @param mobileFile - Mobile banner image (optional)
 * @returns Object with imageUrl and mobileImageUrl
 */
export const uploadBannerImages = async (
  desktopFile: Express.Multer.File,
  mobileFile?: Express.Multer.File
): Promise<{ imageUrl: string; mobileImageUrl?: string }> => {
  try {
    // Upload desktop image
    const imageUrl = await uploadBannerImage(desktopFile, 'desktop');

    // Upload mobile image if provided
    let mobileImageUrl: string | undefined;
    if (mobileFile) {
      mobileImageUrl = await uploadBannerImage(mobileFile, 'mobile');
    }

    return {
      imageUrl,
      mobileImageUrl,
    };
  } catch (error) {
    logger.error('Failed to upload banner images', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to upload banner images');
  }
};

