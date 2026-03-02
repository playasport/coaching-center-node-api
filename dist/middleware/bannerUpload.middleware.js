"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBannerImages = exports.uploadBannerImage = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const imageCompression_1 = require("../utils/imageCompression");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
// Allowed image types including GIF
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.file.invalidType', {
            types: ALLOWED_MIME_TYPES.join(', '),
        })));
    }
};
// Middleware for single banner image upload
const multerUploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.config.media.maxImageSize,
        files: 1,
    },
}).single('image');
// Middleware for banner images (desktop and mobile)
const multerUploadFields = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.config.media.maxImageSize,
        files: 2, // desktop and mobile
    },
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'mobileImage', maxCount: 1 },
]);
/**
 * Upload single banner image (for desktop or mobile)
 */
const uploadBannerImage = (req, res, next) => {
    multerUploadSingle(req, res, async (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        // Compress image if it's compressible (not GIF)
        if (req.file && (0, imageCompression_1.isImage)(req.file.mimetype) && (0, imageCompression_1.canCompressImage)(req.file.mimetype)) {
            try {
                const originalSize = req.file.buffer.length;
                const compressedBuffer = await (0, imageCompression_1.compressImage)(req.file.buffer, req.file.mimetype);
                // Update the file buffer with compressed version
                req.file.buffer = compressedBuffer;
                req.file.size = compressedBuffer.length;
                logger_1.logger.info('Banner image compressed', {
                    originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                    compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                    reduction: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
                });
            }
            catch (error) {
                logger_1.logger.warn('Banner image compression failed, using original', { error });
                // Continue with original image if compression fails
            }
        }
        else if (req.file && req.file.mimetype === 'image/gif') {
            logger_1.logger.info('GIF banner image uploaded (no compression applied)', {
                size: `${(req.file.buffer.length / 1024).toFixed(2)} KB`,
            });
        }
        next();
    });
};
exports.uploadBannerImage = uploadBannerImage;
/**
 * Upload banner images (desktop and mobile)
 */
const uploadBannerImages = (req, res, next) => {
    multerUploadFields(req, res, async (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `File size exceeds ${maxSizeMB}MB limit`));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new ApiError_1.ApiError(400, 'Maximum file count exceeded (max 2 files: image and mobileImage)'));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        const files = req.files;
        // Compress images if compressible (not GIF)
        if (files.image && files.image.length > 0) {
            const imageFile = files.image[0];
            if ((0, imageCompression_1.isImage)(imageFile.mimetype) && (0, imageCompression_1.canCompressImage)(imageFile.mimetype)) {
                try {
                    const originalSize = imageFile.buffer.length;
                    const compressedBuffer = await (0, imageCompression_1.compressImage)(imageFile.buffer, imageFile.mimetype);
                    imageFile.buffer = compressedBuffer;
                    imageFile.size = compressedBuffer.length;
                    logger_1.logger.info('Desktop banner image compressed', {
                        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                        compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                    });
                }
                catch (error) {
                    logger_1.logger.warn('Desktop banner image compression failed, using original', { error });
                }
            }
            else if (imageFile.mimetype === 'image/gif') {
                logger_1.logger.info('GIF desktop banner image uploaded (no compression applied)');
            }
        }
        if (files.mobileImage && files.mobileImage.length > 0) {
            const mobileImageFile = files.mobileImage[0];
            if ((0, imageCompression_1.isImage)(mobileImageFile.mimetype) && (0, imageCompression_1.canCompressImage)(mobileImageFile.mimetype)) {
                try {
                    const originalSize = mobileImageFile.buffer.length;
                    const compressedBuffer = await (0, imageCompression_1.compressImage)(mobileImageFile.buffer, mobileImageFile.mimetype);
                    mobileImageFile.buffer = compressedBuffer;
                    mobileImageFile.size = compressedBuffer.length;
                    logger_1.logger.info('Mobile banner image compressed', {
                        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                        compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                    });
                }
                catch (error) {
                    logger_1.logger.warn('Mobile banner image compression failed, using original', { error });
                }
            }
            else if (mobileImageFile.mimetype === 'image/gif') {
                logger_1.logger.info('GIF mobile banner image uploaded (no compression applied)');
            }
        }
        next();
    });
};
exports.uploadBannerImages = uploadBannerImages;
//# sourceMappingURL=bannerUpload.middleware.js.map