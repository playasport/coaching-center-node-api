import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { compressImage, isImage, canCompressImage } from '../utils/imageCompression';
import { logger } from '../utils/logger';
import { config } from '../config/env';

// Allowed image types including GIF
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        t('validation.file.invalidType', {
          types: ALLOWED_MIME_TYPES.join(', '),
        })
      ) as any
    );
  }
};

// Middleware for single banner image upload
const multerUploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.media.maxImageSize,
    files: 1,
  },
}).single('image');

// Middleware for banner images (desktop and mobile)
const multerUploadFields = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.media.maxImageSize,
    files: 2, // desktop and mobile
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
]);

/**
 * Upload single banner image (for desktop or mobile)
 */
export const uploadBannerImage = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
          return next(new ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    // Compress image if it's compressible (not GIF)
    if (req.file && isImage(req.file.mimetype) && canCompressImage(req.file.mimetype)) {
      try {
        const originalSize = req.file.buffer.length;
        const compressedBuffer = await compressImage(req.file.buffer, req.file.mimetype);
        
        // Update the file buffer with compressed version
        req.file.buffer = compressedBuffer;
        req.file.size = compressedBuffer.length;

        logger.info('Banner image compressed', {
          originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
          compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
          reduction: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
        });
      } catch (error) {
        logger.warn('Banner image compression failed, using original', { error });
        // Continue with original image if compression fails
      }
    } else if (req.file && req.file.mimetype === 'image/gif') {
      logger.info('GIF banner image uploaded (no compression applied)', {
        size: `${(req.file.buffer.length / 1024).toFixed(2)} KB`,
      });
    }

    next();
  });
};

/**
 * Upload banner images (desktop and mobile)
 */
export const uploadBannerImages = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUploadFields(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
          return next(new ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, 'Maximum file count exceeded (max 2 files: image and mobileImage)'));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Compress images if compressible (not GIF)
    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      if (isImage(imageFile.mimetype) && canCompressImage(imageFile.mimetype)) {
        try {
          const originalSize = imageFile.buffer.length;
          const compressedBuffer = await compressImage(imageFile.buffer, imageFile.mimetype);
          imageFile.buffer = compressedBuffer;
          imageFile.size = compressedBuffer.length;
          logger.info('Desktop banner image compressed', {
            originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
            compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
          });
        } catch (error) {
          logger.warn('Desktop banner image compression failed, using original', { error });
        }
      } else if (imageFile.mimetype === 'image/gif') {
        logger.info('GIF desktop banner image uploaded (no compression applied)');
      }
    }

    if (files.mobileImage && files.mobileImage.length > 0) {
      const mobileImageFile = files.mobileImage[0];
      if (isImage(mobileImageFile.mimetype) && canCompressImage(mobileImageFile.mimetype)) {
        try {
          const originalSize = mobileImageFile.buffer.length;
          const compressedBuffer = await compressImage(mobileImageFile.buffer, mobileImageFile.mimetype);
          mobileImageFile.buffer = compressedBuffer;
          mobileImageFile.size = compressedBuffer.length;
          logger.info('Mobile banner image compressed', {
            originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
            compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
          });
        } catch (error) {
          logger.warn('Mobile banner image compression failed, using original', { error });
        }
      } else if (mobileImageFile.mimetype === 'image/gif') {
        logger.info('GIF mobile banner image uploaded (no compression applied)');
      }
    }

    next();
  });
};

