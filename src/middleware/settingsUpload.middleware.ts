import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      ) as any
    );
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.media.maxImageSize, // Use max image size for logo
    files: 1,
  },
}).single('logo');

export const uploadSettingsLogo = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
          return next(new ApiError(400, `Logo file size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, 'Logo file is required'));
    }

    next();
  });
};

