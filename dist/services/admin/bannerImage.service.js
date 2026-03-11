"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBannerImages = exports.uploadBannerImage = void 0;
const s3_service_1 = require("../common/s3.service");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
/**
 * Upload banner image to S3
 * @param file - Multer file object
 * @param type - 'desktop' or 'mobile'
 * @returns S3 URL of uploaded image
 */
const uploadBannerImage = async (file, type = 'desktop') => {
    try {
        if (!file || !file.buffer) {
            throw new ApiError_1.ApiError(400, 'File buffer is missing');
        }
        // Determine folder based on type
        const folder = type === 'mobile' ? 'banners/mobile' : 'banners/desktop';
        // Upload to S3
        const imageUrl = await (0, s3_service_1.uploadFileToS3)({
            file,
            folder,
        });
        logger_1.logger.info('Banner image uploaded to S3', {
            type,
            folder,
            size: `${(file.buffer.length / 1024).toFixed(2)} KB`,
            mimetype: file.mimetype,
        });
        return imageUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload banner image', { type, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to upload banner image');
    }
};
exports.uploadBannerImage = uploadBannerImage;
/**
 * Upload both desktop and mobile banner images
 * @param desktopFile - Desktop banner image
 * @param mobileFile - Mobile banner image (optional)
 * @returns Object with imageUrl and mobileImageUrl
 */
const uploadBannerImages = async (desktopFile, mobileFile) => {
    try {
        // Upload desktop image
        const imageUrl = await (0, exports.uploadBannerImage)(desktopFile, 'desktop');
        // Upload mobile image if provided
        let mobileImageUrl;
        if (mobileFile) {
            mobileImageUrl = await (0, exports.uploadBannerImage)(mobileFile, 'mobile');
        }
        return {
            imageUrl,
            mobileImageUrl,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to upload banner images', { error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to upload banner images');
    }
};
exports.uploadBannerImages = uploadBannerImages;
//# sourceMappingURL=bannerImage.service.js.map