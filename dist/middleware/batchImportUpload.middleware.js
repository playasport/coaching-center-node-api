"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBatchImportFile = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = require("../utils/ApiError");
const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    const isExcel = ALLOWED_MIME_TYPES.includes(file.mimetype) ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls');
    if (isExcel) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.ApiError(400, 'Only Excel files (.xlsx, .xls) are allowed'));
    }
};
const multerUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
    },
}).single('file');
const uploadBatchImportFile = (req, res, next) => {
    multerUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new ApiError_1.ApiError(400, 'File size must be less than 10 MB'));
                }
                return next(new ApiError_1.ApiError(400, err.message));
            }
            return next(err);
        }
        if (!req.file) {
            return next(new ApiError_1.ApiError(400, 'No file uploaded. Use field name: file'));
        }
        next();
    });
};
exports.uploadBatchImportFile = uploadBatchImportFile;
//# sourceMappingURL=batchImportUpload.middleware.js.map