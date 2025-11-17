import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { config } from '../config/env';

// Allowed MIME types for certification documents (only images and PDF)
const ALLOWED_CERTIFICATION_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const storage = multer.memoryStorage();

// File filter for certification documents (only images and PDF)
const certificationFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_CERTIFICATION_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        t('validation.file.invalidType', {
          types: ALLOWED_CERTIFICATION_TYPES.join(', '),
        }) || 'Invalid file type. Allowed types: PDF, JPEG, PNG, WebP'
      ) as any
    );
  }
};

// Upload middleware for certification documents
export const uploadCertification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const multerUpload = multer({
    storage,
    fileFilter: certificationFileFilter,
    limits: {
      fileSize: config.media.maxDocumentSize, // Max document size
      files: 10, // Max 10 certification files at once
    },
  }).fields([
    { name: 'certifications', maxCount: 10 },
  ]);

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxDocumentSize / (1024 * 1024);
          return next(new ApiError(400, `File size exceeds the maximum limit of ${maxSizeMB}MB`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, 'Maximum file count exceeded (max 10 files)'));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    // Validate file types and sizes
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files.certifications) {
      for (const certFile of files.certifications) {
        if (!ALLOWED_CERTIFICATION_TYPES.includes(certFile.mimetype)) {
          return next(new ApiError(400, 'All certification files must be images (JPEG, PNG, WebP) or PDF files'));
        }
        if (certFile.size > config.media.maxDocumentSize) {
          const maxSizeMB = config.media.maxDocumentSize / (1024 * 1024);
          return next(new ApiError(400, `Certification file size exceeds ${maxSizeMB}MB limit`));
        }
      }
    }

    next();
  });
};

