import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as mediaService from '../services/coachingCenterMedia.service';

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

    // Upload logo if provided
    if (files.logo && files.logo.length > 0) {
      const logoFile = files.logo[0];
      const logoUrl = await mediaService.uploadMediaFile({
        file: logoFile,
        mediaType: 'logo',
      });
      result.logo = {
        url: logoUrl,
        type: 'logo',
      };
    }

    // Upload images if provided
    if (files.images && files.images.length > 0) {
      const imageUrls = await mediaService.uploadMultipleMediaFiles(
        files.images,
        'image'
      );
      result.images = {
        urls: imageUrls,
        count: imageUrls.length,
        type: 'image',
      };
    }

    // Upload videos if provided
    if (files.videos && files.videos.length > 0) {
      const videoUrls = await mediaService.uploadMultipleMediaFiles(
        files.videos,
        'video'
      );
      result.videos = {
        urls: videoUrls,
        count: videoUrls.length,
        type: 'video',
      };
    }

    // Upload documents if provided
    if (files.documents && files.documents.length > 0) {
      const documentUrls = await mediaService.uploadMultipleMediaFiles(
        files.documents,
        'document'
      );
      result.documents = {
        urls: documentUrls,
        count: documentUrls.length,
        type: 'document',
      };
    }

    // Check if at least one file type was uploaded
    if (Object.keys(result).length === 0) {
      throw new ApiError(400, 'At least one file is required. Send logo, images, videos, or documents.');
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
