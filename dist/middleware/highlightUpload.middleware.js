"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadHighlightMedia = exports.uploadHighlightPreview = exports.uploadHighlightThumbnail = exports.uploadHighlightVideo = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const env_1 = require("../config/env");
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
const storage = multer_1.default.memoryStorage();
// Video file filter
const videoFileFilter = (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, `Invalid video file type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}`));
    }
};
// Image file filter
const imageFileFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
    }
};
/**
 * Upload video for highlight
 */
const uploadHighlightVideo = (req, res, next) => {
    const multerUpload = (0, multer_1.default)({
        storage,
        fileFilter: videoFileFilter,
        limits: {
            fileSize: env_1.config.media.maxVideoSize,
        },
    }).single('video');
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxVideoSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        if (!req.file) {
            return next(new ApiError_1.ApiError(400, 'Video file is required'));
        }
        next();
    });
};
exports.uploadHighlightVideo = uploadHighlightVideo;
/**
 * Upload thumbnail for highlight
 */
const uploadHighlightThumbnail = (req, res, next) => {
    const multerUpload = (0, multer_1.default)({
        storage,
        fileFilter: imageFileFilter,
        limits: {
            fileSize: env_1.config.media.maxImageSize,
        },
    }).single('thumbnail');
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        next();
    });
};
exports.uploadHighlightThumbnail = uploadHighlightThumbnail;
/**
 * Upload preview video for highlight
 * Preview videos are typically smaller, compressed versions of the main video
 */
const uploadHighlightPreview = (req, res, next) => {
    const multerUpload = (0, multer_1.default)({
        storage,
        fileFilter: videoFileFilter,
        limits: {
            fileSize: env_1.config.media.maxVideoSize, // Can be adjusted if needed for preview videos
        },
    }).single('preview');
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxVideoSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Preview video file size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        if (!req.file) {
            return next(new ApiError_1.ApiError(400, 'Preview video file is required'));
        }
        next();
    });
};
exports.uploadHighlightPreview = uploadHighlightPreview;
/**
 * Upload both video and thumbnail
 */
const uploadHighlightMedia = (req, res, next) => {
    const multerUpload = (0, multer_1.default)({
        storage,
        fileFilter: (req, file, cb) => {
            if (file.fieldname === 'video') {
                videoFileFilter(req, file, cb);
            }
            else if (file.fieldname === 'thumbnail') {
                imageFileFilter(req, file, cb);
            }
            else {
                cb(new ApiError_1.ApiError(400, 'Invalid field name. Use "video" or "thumbnail"'));
            }
        },
        limits: {
            fileSize: env_1.config.media.maxVideoSize, // Use max video size as overall limit
        },
    }).fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
    ]);
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxVideoSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        const files = req.files;
        if (!files.video || files.video.length === 0) {
            return next(new ApiError_1.ApiError(400, 'Video file is required'));
        }
        // Validate video file size
        if (files.video[0].size > env_1.config.media.maxVideoSize) {
            const maxSizeMB = env_1.config.media.maxVideoSize / (1024 * 1024);
            return next(new ApiError_1.ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
        }
        // Validate thumbnail file size if provided
        if (files.thumbnail && files.thumbnail.length > 0) {
            if (files.thumbnail[0].size > env_1.config.media.maxImageSize) {
                const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                return next(new ApiError_1.ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
            }
        }
        next();
    });
};
exports.uploadHighlightMedia = uploadHighlightMedia;
//# sourceMappingURL=highlightUpload.middleware.js.map