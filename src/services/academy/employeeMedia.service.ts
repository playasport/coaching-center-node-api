import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as s3Service from '../common/s3.service';

/**
 * Upload certification document to S3
 * Files are saved in temp/images/coaching/employee/ folder
 */
export const uploadCertificationFile = async (file: Express.Multer.File): Promise<string> => {
  try {
    // Upload to S3 using the s3Service
    const fileUrl = await s3Service.uploadFileToS3({
      file,
      folder: 'temp/images/coaching/employee',
    });

    logger.info('Certification file uploaded to S3', {
      fileName: file.originalname,
      size: file.size,
      url: fileUrl,
    });

    return fileUrl;
  } catch (error) {
    logger.error('Failed to upload certification file:', {
      error: error instanceof Error ? error.message : error,
      fileName: file.originalname,
    });
    throw new ApiError(500, t('employee.media.uploadFailed'));
  }
};

/**
 * Upload multiple certification files
 */
export const uploadMultipleCertificationFiles = async (
  files: Express.Multer.File[]
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => uploadCertificationFile(file));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    logger.error('Failed to upload multiple certification files:', error);
    throw new ApiError(500, t('employee.media.uploadFailed'));
  }
};


