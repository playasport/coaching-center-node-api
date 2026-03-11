"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSettingsLogo = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const env_1 = require("../config/env");
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
    }
};
const multerUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.config.media.maxImageSize, // Use max image size for logo
        files: 1,
    },
}).single('logo');
const uploadSettingsLogo = (req, res, next) => {
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Logo file size exceeds ${maxSizeMB}MB limit`));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        if (!req.file) {
            return next(new ApiError_1.ApiError(400, 'Logo file is required'));
        }
        next();
    });
};
exports.uploadSettingsLogo = uploadSettingsLogo;
//# sourceMappingURL=settingsUpload.middleware.js.map