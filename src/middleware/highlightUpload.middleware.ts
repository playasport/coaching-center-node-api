import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

// Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
];

// Allowed image MIME types for thumbnails
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

// Video file filter
const videoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid video file type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}`
      )
    );
  }
};

// Image file filter
const imageFileFilter = (
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
        `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Upload video for highlight
 */
export const uploadHighlightVideo = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const multerUpload = multer({
    storage,
    fileFilter: videoFileFilter,
    limits: {
      fileSize: config.media.maxVideoSize,
    },
  }).single('video');

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxVideoSize / (1024 * 1024);
          return next(new ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, 'Video file is required'));
    }

    next();
  });
};

/**
 * Upload thumbnail for highlight
 */
export const uploadHighlightThumbnail = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const multerUpload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: config.media.maxImageSize,
    },
  }).single('thumbnail');

  multerUpload(req, res, (err) => {
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

    next();
  });
};

/**
 * Upload preview video for highlight
 * Preview videos are typically smaller, compressed versions of the main video
 */
export const uploadHighlightPreview = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const multerUpload = multer({
    storage,
    fileFilter: videoFileFilter,
    limits: {
      fileSize: config.media.maxVideoSize, // Can be adjusted if needed for preview videos
    },
  }).single('preview');

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxVideoSize / (1024 * 1024);
          return next(new ApiError(400, `Preview video file size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, 'Preview video file is required'));
    }

    next();
  });
};

/**
 * Upload both video and thumbnail
 */
export const uploadHighlightMedia = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const multerUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'video') {
        videoFileFilter(req, file, cb);
      } else if (file.fieldname === 'thumbnail') {
        imageFileFilter(req, file, cb);
      } else {
        cb(new ApiError(400, 'Invalid field name. Use "video" or "thumbnail"'));
      }
    },
    limits: {
      fileSize: config.media.maxVideoSize, // Use max video size as overall limit
    },
  }).fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]);

  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = config.media.maxVideoSize / (1024 * 1024);
          return next(new ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.video || files.video.length === 0) {
      return next(new ApiError(400, 'Video file is required'));
    }

    // Validate video file size
    if (files.video[0].size > config.media.maxVideoSize) {
      const maxSizeMB = config.media.maxVideoSize / (1024 * 1024);
      return next(new ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
    }

    // Validate thumbnail file size if provided
    if (files.thumbnail && files.thumbnail.length > 0) {
      if (files.thumbnail[0].size > config.media.maxImageSize) {
        const maxSizeMB = config.media.maxImageSize / (1024 * 1024);
        return next(new ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
      }
    }

    next();
  });
};

