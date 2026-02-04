import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { config } from '../config/env';

// Allowed MIME types for different file categories
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.memoryStorage();

// Pre-compute once (avoids array spread + includes on every file)
const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];
const ALL_ALLOWED_TYPES_STR = ALL_ALLOWED_TYPES.join(', ');

const unifiedFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        t('validation.file.invalidType', { types: ALL_ALLOWED_TYPES_STR })
      ) as any
    );
  }
};

// Create multer instance once (avoids re-creating on every request)
const uploadMediaMulter = multer({
  storage,
  fileFilter: unifiedFileFilter,
  limits: {
    fileSize: config.media.maxVideoSize,
    files: config.media.maxTotalFilesCount,
  },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'logo[]', maxCount: 1 },
  { name: 'images', maxCount: config.media.maxImagesCount },
  { name: 'images[]', maxCount: config.media.maxImagesCount },
  { name: 'videos', maxCount: config.media.maxVideosCount },
  { name: 'videos[]', maxCount: config.media.maxVideosCount },
  { name: 'documents', maxCount: config.media.maxDocumentsCount },
  { name: 'documents[]', maxCount: config.media.maxDocumentsCount },
]);

// Unified upload middleware that accepts all media types
export const uploadMedia = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  uploadMediaMulter(req, res, (err) => {
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

    // Normalize logo: merge logo[] into logo (support both field names, single file)
    if (files['logo[]']?.length) {
      files.logo = [...(files.logo || []), ...files['logo[]']].slice(0, 1);
      delete files['logo[]'];
    }

    // Normalize images: merge images[] into images (support both field names)
    if (files['images[]']?.length) {
      files.images = [...(files.images || []), ...files['images[]']];
      delete files['images[]'];
    }
    if (files.images && files.images.length > config.media.maxImagesCount) {
      return next(
        new ApiError(400, `Images count exceeds maximum of ${config.media.maxImagesCount}`)
      );
    }

    // Normalize videos: merge videos[] into videos (support both field names)
    if (files['videos[]']?.length) {
      files.videos = [...(files.videos || []), ...files['videos[]']];
      delete files['videos[]'];
    }
    if (files.videos && files.videos.length > config.media.maxVideosCount) {
      return next(
        new ApiError(400, `Videos count exceeds maximum of ${config.media.maxVideosCount}`)
      );
    }

    // Normalize documents: merge documents[] into documents (support both field names)
    if (files['documents[]']?.length) {
      files.documents = [...(files.documents || []), ...files['documents[]']];
      delete files['documents[]'];
    }
    if (files.documents && files.documents.length > config.media.maxDocumentsCount) {
      return next(
        new ApiError(400, `Documents count exceeds maximum of ${config.media.maxDocumentsCount}`)
      );
    }

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
          return next(new ApiError(400, 'All documents must be document files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG)'));
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

// Thumbnail file filter (reused for single instance)
const thumbnailFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(400, 'Thumbnail must be an image file (JPEG, PNG, WebP)') as any
    );
  }
};

// Create once (avoids re-creating on every request)
const uploadThumbnailMulter = multer({
  storage,
  fileFilter: thumbnailFileFilter,
  limits: { fileSize: config.media.maxImageSize },
}).single('thumbnail');

// Single image upload middleware for video thumbnail
export const uploadThumbnail = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  uploadThumbnailMulter(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
          return next(new ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    // Validate file if present
    if (req.file) {
      const file = req.file;
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return next(new ApiError(400, 'Thumbnail must be an image file (JPEG, PNG, WebP)'));
      }
      if (file.size > config.media.maxImageSize) {
        const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
        return next(new ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
      }
    }

    next();
  });
};