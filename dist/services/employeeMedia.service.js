"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultipleCertificationFiles = exports.uploadCertificationFile = void 0;
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const s3Service = __importStar(require("./s3.service"));
/**
 * Upload certification document to S3
 * Files are saved in temp/images/coaching/employee/ folder
 */
const uploadCertificationFile = async (file) => {
    try {
        // Upload to S3 using the s3Service
        const fileUrl = await s3Service.uploadFileToS3({
            file,
            folder: 'temp/images/coaching/employee',
        });
        logger_1.logger.info('Certification file uploaded to S3', {
            fileName: file.originalname,
            size: file.size,
            url: fileUrl,
        });
        return fileUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload certification file:', {
            error: error instanceof Error ? error.message : error,
            fileName: file.originalname,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.media.uploadFailed'));
    }
};
exports.uploadCertificationFile = uploadCertificationFile;
/**
 * Upload multiple certification files
 */
const uploadMultipleCertificationFiles = async (files) => {
    try {
        const uploadPromises = files.map((file) => (0, exports.uploadCertificationFile)(file));
        const urls = await Promise.all(uploadPromises);
        return urls;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload multiple certification files:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('employee.media.uploadFailed'));
    }
};
exports.uploadMultipleCertificationFiles = uploadMultipleCertificationFiles;
//# sourceMappingURL=employeeMedia.service.js.map