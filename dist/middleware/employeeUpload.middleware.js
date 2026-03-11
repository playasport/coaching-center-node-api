"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCertification = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const env_1 = require("../config/env");
// Allowed MIME types for certification documents (only images and PDF)
const ALLOWED_CERTIFICATION_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];
const storage = multer_1.default.memoryStorage();
// File filter for certification documents (only images and PDF)
const certificationFileFilter = (_req, file, cb) => {
    if (ALLOWED_CERTIFICATION_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.file.invalidType', {
            types: ALLOWED_CERTIFICATION_TYPES.join(', '),
        }) || 'Invalid file type. Allowed types: PDF, JPEG, PNG, WebP'));
    }
};
// Upload middleware for certification documents
const uploadCertification = (req, res, next) => {
    const multerUpload = (0, multer_1.default)({
        storage,
        fileFilter: certificationFileFilter,
        limits: {
            fileSize: env_1.config.media.maxDocumentSize, // Max document size
            files: 10, // Max 10 certification files at once
        },
    }).fields([
        { name: 'certifications', maxCount: 10 },
    ]);
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = env_1.config.media.maxDocumentSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `File size exceeds the maximum limit of ${maxSizeMB}MB`));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new ApiError_1.ApiError(400, 'Maximum file count exceeded (max 10 files)'));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        // Validate file types and sizes
        const files = req.files;
        if (files.certifications) {
            for (const certFile of files.certifications) {
                if (!ALLOWED_CERTIFICATION_TYPES.includes(certFile.mimetype)) {
                    return next(new ApiError_1.ApiError(400, 'All certification files must be images (JPEG, PNG, WebP) or PDF files'));
                }
                if (certFile.size > env_1.config.media.maxDocumentSize) {
                    const maxSizeMB = env_1.config.media.maxDocumentSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Certification file size exceeds ${maxSizeMB}MB limit`));
                }
            }
        }
        next();
    });
};
exports.uploadCertification = uploadCertification;
//# sourceMappingURL=employeeUpload.middleware.js.map