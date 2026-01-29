import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as bannerImageService from '../../services/admin/bannerImage.service';

/**
 * Upload single banner image (desktop or mobile)
 */
export const uploadBannerImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No image file provided');
    }

    // Determine type from query parameter or default to desktop
    const type = (req.query.type as 'desktop' | 'mobile') || 'desktop';

    const imageUrl = await bannerImageService.uploadBannerImage(req.file, type);

    const response = new ApiResponse(
      200,
      { imageUrl, type },
      'Banner image uploaded successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload banner images (desktop and mobile)
 */
export const uploadBannerImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.image || files.image.length === 0) {
      throw new ApiError(400, 'Desktop image (image) is required');
    }

    const desktopFile = files.image[0];
    const mobileFile = files.mobileImage && files.mobileImage.length > 0 ? files.mobileImage[0] : undefined;

    const result = await bannerImageService.uploadBannerImages(desktopFile, mobileFile);

    const response = new ApiResponse(
      200,
      result,
      'Banner images uploaded successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

