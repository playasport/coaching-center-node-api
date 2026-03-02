"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSportImage = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const imageCompression_1 = require("../utils/imageCompression");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
const multerUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.config.media.maxImageSize, // Use max image size (5MB typically)
        files: 1,
    },
});
const uploadSportImage = (req, res, next) => {
    // Use single() but make it optional - allows requests without file
    multerUpload.single('image')(req, res, async (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.file.tooLarge')));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        // Compress image if it's an image file
        if (req.file && (0, imageCompression_1.isImage)(req.file.mimetype)) {
            try {
                const originalSize = req.file.buffer.length;
                const compressedBuffer = await (0, imageCompression_1.compressImage)(req.file.buffer, req.file.mimetype);
                // Update the file buffer with compressed version
                req.file.buffer = compressedBuffer;
                req.file.size = compressedBuffer.length;
                logger_1.logger.info('Sport image compressed', {
                    originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                    compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                    reduction: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
                });
            }
            catch (error) {
                logger_1.logger.warn('Sport image compression failed, using original', { error });
                // Continue with original image if compression fails
            }
        }
        next();
    });
};
exports.uploadSportImage = uploadSportImage;
//# sourceMappingURL=sportUpload.middleware.js.map