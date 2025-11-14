import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { config } from '../config/env';

// Allowed MIME types for different file categories
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.memoryStorage();

// Unified file filter that accepts all media types
const unifiedFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allAllowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
  ];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        t('validation.file.invalidType', {
          types: allAllowedTypes.join(', '),
        })
      ) as any
    );
  }
};

// Unified upload middleware that accepts all media types
export const uploadMedia = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use fields to accept multiple field names
  const multerUpload = multer({
    storage,
    fileFilter: unifiedFileFilter,
    limits: {
      fileSize: config.media.maxVideoSize, // Use max video size as overall limit
      files: config.media.maxTotalFilesCount, // Total files limit
    },
  }).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'images', maxCount: config.media.maxImagesCount },
    { name: 'videos', maxCount: config.media.maxVideosCount },
    { name: 'documents', maxCount: config.media.maxDocumentsCount },
  ]);

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size exceeds the maximum limit'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, 'Maximum file count exceeded'));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    // Validate file types based on field names
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files.logo) {
      const logoFile = files.logo[0];
      if (!ALLOWED_IMAGE_TYPES.includes(logoFile.mimetype)) {
        return next(new ApiError(400, 'Logo must be an image file (JPEG, PNG, WebP)'));
      }
      if (logoFile.size > config.media.maxImageSize) {
        const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
        return next(new ApiError(400, `Logo file size exceeds ${maxSizeMB}MB limit`));
      }
    }

    if (files.images) {
      for (const imageFile of files.images) {
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.mimetype)) {
          return next(new ApiError(400, 'All images must be image files (JPEG, PNG, WebP)'));
        }
        if (imageFile.size > config.media.maxImageSize) {
          const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
          return next(new ApiError(400, `Image file size exceeds ${maxSizeMB}MB limit`));
        }
      }
    }

    if (files.videos) {
      for (const videoFile of files.videos) {
        if (!ALLOWED_VIDEO_TYPES.includes(videoFile.mimetype)) {
          return next(new ApiError(400, 'All videos must be video files (MP4, MPEG, MOV, AVI)'));
        }
        if (videoFile.size > config.media.maxVideoSize) {
          const maxSizeMB = config.media.maxVideoSize / (1024 * 1024);
          return next(new ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
        }
      }
    }

    if (files.documents) {
      for (const docFile of files.documents) {
        if (!ALLOWED_DOCUMENT_TYPES.includes(docFile.mimetype)) {
          return next(new ApiError(400, 'All documents must be document files (PDF, DOC, DOCX, XLS, XLSX)'));
        }
        if (docFile.size > config.media.maxDocumentSize) {
          const maxSizeMB = config.media.maxDocumentSize / (1024 * 1024);
          return next(new ApiError(400, `Document file size exceeds ${maxSizeMB}MB limit`));
        }
      }
    }

    next();
  });
};
