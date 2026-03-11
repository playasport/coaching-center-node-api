"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadThumbnail = exports.uploadMedia = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const env_1 = require("../config/env");
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
const storage = multer_1.default.memoryStorage();
// Pre-compute once (avoids array spread + includes on every file)
const ALL_ALLOWED_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
];
const ALL_ALLOWED_TYPES_STR = ALL_ALLOWED_TYPES.join(', ');
const unifiedFileFilter = (_req, file, cb) => {
    if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.file.invalidType', { types: ALL_ALLOWED_TYPES_STR })));
    }
};
// Create multer instance once (avoids re-creating on every request)
const uploadMediaMulter = (0, multer_1.default)({
    storage,
    fileFilter: unifiedFileFilter,
    limits: {
        fileSize: env_1.config.media.maxVideoSize,
        files: env_1.config.media.maxTotalFilesCount,
    },
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logo[]', maxCount: 1 },
    { name: 'images', maxCount: env_1.config.media.maxImagesCount },
    { name: 'images[]', maxCount: env_1.config.media.maxImagesCount },
    { name: 'videos', maxCount: env_1.config.media.maxVideosCount },
    { name: 'videos[]', maxCount: env_1.config.media.maxVideosCount },
    { name: 'documents', maxCount: env_1.config.media.maxDocumentsCount },
    { name: 'documents[]', maxCount: env_1.config.media.maxDocumentsCount },
]);
// Unified upload middleware that accepts all media types
const uploadMedia = (req, res, next) => {
    uploadMediaMulter(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new ApiError_1.ApiError(400, 'File size exceeds the maximum limit'));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new ApiError_1.ApiError(400, 'Maximum file count exceeded'));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        // Validate file types based on field names
        const files = req.files;
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
        if (files.images && files.images.length > env_1.config.media.maxImagesCount) {
            return next(new ApiError_1.ApiError(400, `Images count exceeds maximum of ${env_1.config.media.maxImagesCount}`));
        }
        // Normalize videos: merge videos[] into videos (support both field names)
        if (files['videos[]']?.length) {
            files.videos = [...(files.videos || []), ...files['videos[]']];
            delete files['videos[]'];
        }
        if (files.videos && files.videos.length > env_1.config.media.maxVideosCount) {
            return next(new ApiError_1.ApiError(400, `Videos count exceeds maximum of ${env_1.config.media.maxVideosCount}`));
        }
        // Normalize documents: merge documents[] into documents (support both field names)
        if (files['documents[]']?.length) {
            files.documents = [...(files.documents || []), ...files['documents[]']];
            delete files['documents[]'];
        }
        if (files.documents && files.documents.length > env_1.config.media.maxDocumentsCount) {
            return next(new ApiError_1.ApiError(400, `Documents count exceeds maximum of ${env_1.config.media.maxDocumentsCount}`));
        }
        if (files.logo) {
            const logoFile = files.logo[0];
            if (!ALLOWED_IMAGE_TYPES.includes(logoFile.mimetype)) {
                return next(new ApiError_1.ApiError(400, 'Logo must be an image file (JPEG, PNG, WebP)'));
            }
            if (logoFile.size > env_1.config.media.maxImageSize) {
                const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                return next(new ApiError_1.ApiError(400, `Logo file size exceeds ${maxSizeMB}MB limit`));
            }
        }
        if (files.images) {
            for (const imageFile of files.images) {
                if (!ALLOWED_IMAGE_TYPES.includes(imageFile.mimetype)) {
                    return next(new ApiError_1.ApiError(400, 'All images must be image files (JPEG, PNG, WebP)'));
                }
                if (imageFile.size > env_1.config.media.maxImageSize) {
                    const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Image file size exceeds ${maxSizeMB}MB limit`));
                }
            }
        }
        if (files.videos) {
            for (const videoFile of files.videos) {
                if (!ALLOWED_VIDEO_TYPES.includes(videoFile.mimetype)) {
                    return next(new ApiError_1.ApiError(400, 'All videos must be video files (MP4, MPEG, MOV, AVI)'));
                }
                if (videoFile.size > env_1.config.media.maxVideoSize) {
                    const maxSizeMB = env_1.config.media.maxVideoSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Video file size exceeds ${maxSizeMB}MB limit`));
                }
            }
        }
        if (files.documents) {
            for (const docFile of files.documents) {
                if (!ALLOWED_DOCUMENT_TYPES.includes(docFile.mimetype)) {
                    return next(new ApiError_1.ApiError(400, 'All documents must be document files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG)'));
                }
                if (docFile.size > env_1.config.media.maxDocumentSize) {
                    const maxSizeMB = env_1.config.media.maxDocumentSize / (1024 * 1024);
                    return next(new ApiError_1.ApiError(400, `Document file size exceeds ${maxSizeMB}MB limit`));
                }
            }
        }
        next();
    });
};
exports.uploadMedia = uploadMedia;
// Thumbnail file filter (reused for single instance)
const thumbnailFileFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, 'Thumbnail must be an image file (JPEG, PNG, WebP)'));
    }
};
// Create once (avoids re-creating on every request)
const uploadThumbnailMulter = (0, multer_1.default)({
    storage,
    fileFilter: thumbnailFileFilter,
    limits: { fileSize: env_1.config.media.maxImageSize },
}).single('thumbnail');
// Single image upload middleware for video thumbnail
const uploadThumbnail = (req, res, next) => {
    uploadThumbnailMulter(req, res, (err) => {
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
        // Validate file if present
        if (req.file) {
            const file = req.file;
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                return next(new ApiError_1.ApiError(400, 'Thumbnail must be an image file (JPEG, PNG, WebP)'));
            }
            if (file.size > env_1.config.media.maxImageSize) {
                const maxSizeMB = env_1.config.media.maxImageSize / (1024 * 1024);
                return next(new ApiError_1.ApiError(400, `Thumbnail file size exceeds ${maxSizeMB}MB limit`));
            }
        }
        next();
    });
};
exports.uploadThumbnail = uploadThumbnail;
//# sourceMappingURL=coachingCenterUpload.middleware.js.map