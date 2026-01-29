import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import * as mediaService from '../../services/common/coachingCenterMedia.service';

/**
 * Unified media upload controller
 * Handles logo, images, videos, and documents in a single endpoint
 */
export const uploadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: any = {};

    // Process all file types in parallel for better performance
    const uploadPromises: Promise<any>[] = [];

    // Prepare logo upload promise
    if (files.logo && files.logo.length > 0) {
      const logoFile = files.logo[0];
      uploadPromises.push(
        mediaService.uploadMediaFile({
          file: logoFile,
          mediaType: 'logo',
        }).then((logoUrl) => ({
          type: 'logo',
          data: {
            url: logoUrl,
            type: 'logo',
          },
        })).catch((error) => {
          logger.error('Failed to upload logo', { error });
          return { type: 'logo', error };
        })
      );
    }

    // Prepare images upload promise
    if (files.images && files.images.length > 0) {
      uploadPromises.push(
        mediaService.uploadMultipleMediaFiles(files.images, 'image').then((imageUrls) => ({
          type: 'images',
          data: {
            urls: imageUrls,
            count: imageUrls.length,
            type: 'image',
          },
        })).catch((error) => {
          logger.error('Failed to upload images', { error, count: files.images.length });
          return { type: 'images', error };
        })
      );
    }

    // Prepare videos upload promise
    if (files.videos && files.videos.length > 0) {
      uploadPromises.push(
        mediaService.uploadMultipleMediaFiles(files.videos, 'video').then((videoUrls) => ({
          type: 'videos',
          data: {
            urls: videoUrls,
            count: videoUrls.length,
            type: 'video',
          },
        })).catch((error) => {
          logger.error('Failed to upload videos', { error, count: files.videos.length });
          return { type: 'videos', error };
        })
      );
    }

    // Prepare documents upload promise
    if (files.documents && files.documents.length > 0) {
      uploadPromises.push(
        mediaService.uploadMultipleMediaFiles(files.documents, 'document').then((documentUrls) => ({
          type: 'documents',
          data: {
            urls: documentUrls,
            count: documentUrls.length,
            type: 'document',
          },
        })).catch((error) => {
          logger.error('Failed to upload documents', { error, count: files.documents.length });
          return { type: 'documents', error };
        })
      );
    }

    // Check if at least one file type was provided
    if (uploadPromises.length === 0) {
      throw new ApiError(400, 'At least one file is required. Send logo, images, videos, or documents.');
    }

    // Wait for all uploads to complete in parallel
    const uploadResults = await Promise.all(uploadPromises);

    // Process results and build response
    let hasSuccess = false;
    const errors: string[] = [];

    for (const uploadResult of uploadResults) {
      if (uploadResult.error) {
        // Log error and track it
        const errorMessage = uploadResult.error instanceof Error 
          ? uploadResult.error.message 
          : String(uploadResult.error);
        errors.push(`${uploadResult.type}: ${errorMessage}`);
        logger.warn(`Upload failed for ${uploadResult.type}`, { error: uploadResult.error });
        continue;
      }

      hasSuccess = true;
      switch (uploadResult.type) {
        case 'logo':
          result.logo = uploadResult.data;
          break;
        case 'images':
          result.images = uploadResult.data;
          break;
        case 'videos':
          result.videos = uploadResult.data;
          break;
        case 'documents':
          result.documents = uploadResult.data;
          break;
      }
    }

    // If all uploads failed, throw error
    if (!hasSuccess) {
      throw new ApiError(500, `All file uploads failed: ${errors.join('; ')}`);
    }

    const response = new ApiResponse(
      200,
      result,
      t('coachingCenter.media.uploadSuccess')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};
