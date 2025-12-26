import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { compressImage, isImage } from '../utils/imageCompression';
import { logger } from '../utils/logger';
import { config } from '../config/env';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.media.maxImageSize, // Use max image size (5MB typically)
    files: 1,
  },
});

export const uploadSportImage = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use single() but make it optional - allows requests without file
  multerUpload.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, t('validation.file.tooLarge')));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    // Compress image if it's an image file
    if (req.file && isImage(req.file.mimetype)) {
      try {
        const originalSize = req.file.buffer.length;
        const compressedBuffer = await compressImage(req.file.buffer, req.file.mimetype);
        
        // Update the file buffer with compressed version
        req.file.buffer = compressedBuffer;
        req.file.size = compressedBuffer.length;

        logger.info('Sport image compressed', {
          originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
          compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
          reduction: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
        });
      } catch (error) {
        logger.warn('Sport image compression failed, using original', { error });
        // Continue with original image if compression fails
      }
    }

    next();
  });
};

