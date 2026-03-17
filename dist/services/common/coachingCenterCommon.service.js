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
exports.uploadVideoThumbnail = exports.uploadThumbnailFile = exports.setBannerImage = exports.removeMediaFromCoachingCenter = exports.resolveFacilities = exports.validatePublishStatus = exports.moveMediaFilesToPermanent = exports.extractFileUrlsFromCoachingCenter = exports.enqueueThumbnailGenerationForVideos = exports.toggleCoachingCenterStatus = exports.deleteCoachingCenter = exports.getCoachingCenterById = exports.getQueryById = void 0;
const mongoose_1 = require("mongoose");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const facility_model_1 = require("../../models/facility.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const mediaService = __importStar(require("./coachingCenterMedia.service"));
const facility_service_1 = require("./facility.service");
const thumbnailQueue_1 = require("../../queue/thumbnailQueue");
/**
 * Helper to get query by ID (supports both MongoDB ObjectId and custom UUID id)
 */
const getQueryById = (id) => {
    return mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
};
exports.getQueryById = getQueryById;
/**
 * Filter out deleted media items
 */
const filterDeletedMedia = (items) => {
    if (!items || !Array.isArray(items))
        return items;
    return items.filter(item => !item.is_deleted);
};
/**
 * Sort images so banner images appear first (after filtering deleted)
 */
const sortImagesWithBannerFirst = (images) => {
    if (!images || !Array.isArray(images))
        return images;
    // First filter out deleted images, then sort
    const activeImages = filterDeletedMedia(images);
    return activeImages.sort((a, b) => {
        // Banner images first (is_banner: true comes before false)
        if (a.is_banner && !b.is_banner)
            return -1;
        if (!a.is_banner && b.is_banner)
            return 1;
        return 0; // Keep original order for non-banner images
    });
};
/**
 * Sort sport_details images so banner images appear first and filter deleted media
 */
const sortSportDetailsImages = (sportDetails) => {
    if (!sportDetails || !Array.isArray(sportDetails))
        return sportDetails;
    return sportDetails.map((sportDetail) => {
        const filteredDetail = { ...sportDetail };
        // Filter and sort images
        if (sportDetail.images && Array.isArray(sportDetail.images)) {
            filteredDetail.images = sortImagesWithBannerFirst(sportDetail.images);
        }
        // Filter deleted videos
        if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
            filteredDetail.videos = filterDeletedMedia(sportDetail.videos);
        }
        return filteredDetail;
    });
};
/**
 * Filter deleted documents from coaching center
 */
const filterDeletedDocuments = (documents) => {
    if (!documents || !Array.isArray(documents))
        return documents;
    return filterDeletedMedia(documents);
};
/**
 * Get coaching center by ID (supports both MongoDB ObjectId and custom UUID id)
 */
const getCoachingCenterById = async (id) => {
    try {
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne((0, exports.getQueryById)(id))
            .populate('sports', 'custom_id name logo is_popular')
            .populate('sport_details.sport_id', 'custom_id name logo is_popular')
            .populate('facility', 'custom_id name description icon')
            .populate({
            path: 'user',
            select: 'id firstName middleName lastName email isDeleted',
            // Don't use match here - it can exclude parent documents
            // Instead, we'll check if user is deleted and return 404
            options: { lean: true },
        })
            .lean();
        if (!coachingCenter) {
            return null;
        }
        // Return 404 if user is deleted
        if (coachingCenter.user && coachingCenter.user.isDeleted) {
            return null;
        }
        // Filter deleted documents
        if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
            coachingCenter.documents = filterDeletedDocuments(coachingCenter.documents);
        }
        // Sort images so banner images appear first and filter deleted media
        if (coachingCenter.sport_details) {
            coachingCenter.sport_details = sortSportDetailsImages(coachingCenter.sport_details);
        }
        return coachingCenter;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch coaching center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.get.failed'));
    }
};
exports.getCoachingCenterById = getCoachingCenterById;
/**
 * Soft delete coaching center
 */
const deleteCoachingCenter = async (id) => {
    try {
        const query = (0, exports.getQueryById)(id);
        const existingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!existingCenter || existingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, {
            is_deleted: true,
            deletedAt: new Date(),
        }, { runValidators: true });
        // Invalidate cache after deleting a coaching center (non-blocking)
        const { invalidateCoachingCentersListCache } = await Promise.resolve().then(() => __importStar(require('../../utils/coachingCenterCache')));
        invalidateCoachingCentersListCache().catch((cacheError) => {
            logger_1.logger.warn('Failed to invalidate coaching centers list cache after delete (non-blocking)', {
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        });
        logger_1.logger.info('Coaching center soft deleted successfully', { coachingCenterId: id });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to delete coaching center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.delete.failed'));
    }
};
exports.deleteCoachingCenter = deleteCoachingCenter;
/**
 * Toggle active status
 */
const toggleCoachingCenterStatus = async (id) => {
    try {
        const query = (0, exports.getQueryById)(id);
        const existingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!existingCenter || existingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const newActiveStatus = !existingCenter.is_active;
        const updatedCenter = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, { is_active: newActiveStatus }, { new: true, runValidators: true })
            .populate('sports', 'custom_id name logo is_popular')
            .populate('sport_details.sport_id', 'custom_id name logo is_popular')
            .populate('facility', 'custom_id name description icon')
            .populate({
            path: 'user',
            select: 'id firstName middleName lastName email',
            match: { isDeleted: false },
        })
            .lean();
        if (!updatedCenter)
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        // Filter deleted documents and sort images so banner images appear first
        if (updatedCenter) {
            // Filter deleted documents
            if (updatedCenter.documents && Array.isArray(updatedCenter.documents)) {
                updatedCenter.documents = filterDeletedDocuments(updatedCenter.documents);
            }
            // Sort images so banner images appear first and filter deleted media
            if (updatedCenter.sport_details) {
                updatedCenter.sport_details = sortSportDetailsImages(updatedCenter.sport_details);
            }
        }
        logger_1.logger.info('Coaching center status toggled', { id, newStatus: newActiveStatus });
        return updatedCenter;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to toggle status:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.toggleStatus.failed'));
    }
};
exports.toggleCoachingCenterStatus = toggleCoachingCenterStatus;
/**
 * Enqueue thumbnail generation for videos
 */
const enqueueThumbnailGenerationForVideos = async (coachingCenter) => {
    try {
        const coachingCenterId = coachingCenter._id?.toString() || coachingCenter.id;
        if (!coachingCenterId || !coachingCenter.sport_details)
            return;
        for (let sportIndex = 0; sportIndex < coachingCenter.sport_details.length; sportIndex++) {
            const sportDetail = coachingCenter.sport_details[sportIndex];
            if (sportDetail.videos) {
                for (let videoIndex = 0; videoIndex < sportDetail.videos.length; videoIndex++) {
                    const video = sportDetail.videos[videoIndex];
                    if (video.url && !video.is_deleted && !video.thumbnail) {
                        await (0, thumbnailQueue_1.enqueueThumbnailGeneration)(coachingCenterId, video.url, {
                            videoUniqueId: video.unique_id,
                            sportDetailIndex: sportIndex,
                            videoIndex: videoIndex,
                        });
                    }
                }
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to enqueue thumbnail generation', { error });
    }
};
exports.enqueueThumbnailGenerationForVideos = enqueueThumbnailGenerationForVideos;
/**
 * Extract all file URLs from coaching center that need to be moved
 */
const extractFileUrlsFromCoachingCenter = (coachingCenter) => {
    const fileUrls = [];
    if (coachingCenter.logo)
        fileUrls.push(coachingCenter.logo);
    coachingCenter.sport_details?.forEach(sd => {
        sd.images?.forEach(img => { if (img.url && !img.is_deleted)
            fileUrls.push(img.url); });
        sd.videos?.forEach(vid => {
            if (vid.url && !vid.is_deleted)
                fileUrls.push(vid.url);
            if (vid.thumbnail && !vid.is_deleted)
                fileUrls.push(vid.thumbnail);
        });
    });
    coachingCenter.documents?.forEach(doc => { if (doc.url && !doc.is_deleted)
        fileUrls.push(doc.url); });
    return fileUrls;
};
exports.extractFileUrlsFromCoachingCenter = extractFileUrlsFromCoachingCenter;
/**
 * Move media from temp to permanent
 */
const moveMediaFilesToPermanent = async (coachingCenter) => {
    try {
        const fileUrls = [];
        const coachingCenterId = coachingCenter._id || coachingCenter.id;
        if (!coachingCenterId) {
            logger_1.logger.error('Coaching center ID required for moving media files');
            throw new Error('Coaching center ID required');
        }
        logger_1.logger.info('Starting media file move to permanent location', {
            coachingCenterId: coachingCenterId.toString(),
            hasLogo: !!coachingCenter.logo,
            sportDetailsCount: coachingCenter.sport_details?.length || 0,
            documentsCount: coachingCenter.documents?.length || 0
        });
        if (coachingCenter.logo)
            fileUrls.push(coachingCenter.logo);
        coachingCenter.sport_details?.forEach(sd => {
            sd.images?.forEach(img => { if (img.url && !img.is_deleted)
                fileUrls.push(img.url); });
            sd.videos?.forEach(vid => {
                if (vid.url && !vid.is_deleted)
                    fileUrls.push(vid.url);
                if (vid.thumbnail && !vid.is_deleted)
                    fileUrls.push(vid.thumbnail);
            });
        });
        coachingCenter.documents?.forEach(doc => { if (doc.url && !doc.is_deleted)
            fileUrls.push(doc.url); });
        if (fileUrls.length === 0) {
            logger_1.logger.info('No media files to move', { coachingCenterId: coachingCenterId.toString() });
            return;
        }
        logger_1.logger.info('Moving files to permanent location', {
            coachingCenterId: coachingCenterId.toString(),
            fileCount: fileUrls.length,
            files: fileUrls
        });
        const permanentUrls = await mediaService.moveFilesToPermanent(fileUrls);
        const urlMap = new Map();
        fileUrls.forEach((temp, i) => {
            if (permanentUrls[i] && permanentUrls[i] !== temp) {
                urlMap.set(temp, permanentUrls[i]);
                logger_1.logger.info('File moved successfully', { temp, permanent: permanentUrls[i] });
            }
        });
        logger_1.logger.info('File move results', {
            coachingCenterId: coachingCenterId.toString(),
            totalFiles: fileUrls.length,
            movedFiles: urlMap.size,
            urlMap: Object.fromEntries(urlMap)
        });
        const updateQuery = {};
        let hasUpdates = false;
        // Update logo if it was moved
        if (coachingCenter.logo) {
            logger_1.logger.info('Checking logo URL', { logo: coachingCenter.logo, urlMapHasLogo: urlMap.has(coachingCenter.logo) });
            if (urlMap.has(coachingCenter.logo)) {
                const newLogoUrl = urlMap.get(coachingCenter.logo);
                // Only update if URL actually changed (not a blob URL or already permanent)
                if (newLogoUrl && newLogoUrl !== coachingCenter.logo && !newLogoUrl.startsWith('blob:')) {
                    updateQuery.logo = newLogoUrl;
                    hasUpdates = true;
                    logger_1.logger.info('Logo URL updated', { old: coachingCenter.logo, new: newLogoUrl });
                }
            }
            else {
                logger_1.logger.warn('Logo URL not found in urlMap', { logo: coachingCenter.logo, urlMapKeys: Array.from(urlMap.keys()) });
            }
        }
        // Update sport_details with new URLs and regenerate unique_ids
        if (coachingCenter.sport_details) {
            let sportDetailsHasUpdates = false;
            const updatedSportDetails = coachingCenter.sport_details.map((sd, sdIndex) => {
                // Handle sport_id - extract the actual ID value
                let sportId;
                if (sd.sport_id instanceof mongoose_1.Types.ObjectId) {
                    sportId = sd.sport_id;
                }
                else if (typeof sd.sport_id === 'string') {
                    // If it's a string, convert to ObjectId for MongoDB
                    if (mongoose_1.Types.ObjectId.isValid(sd.sport_id)) {
                        sportId = new mongoose_1.Types.ObjectId(sd.sport_id);
                    }
                    else {
                        logger_1.logger.error('Invalid sport_id string format', { sport_id: sd.sport_id, sportDetailIndex: sdIndex });
                        throw new Error(`Invalid sport_id format at index ${sdIndex}: ${sd.sport_id}`);
                    }
                }
                else if (sd.sport_id && typeof sd.sport_id === 'object' && sd.sport_id._id) {
                    // If it's a populated object, extract the _id
                    const idValue = sd.sport_id._id;
                    sportId = idValue instanceof mongoose_1.Types.ObjectId ? idValue : new mongoose_1.Types.ObjectId(String(idValue));
                }
                else {
                    logger_1.logger.error('Unexpected sport_id format', { sport_id: sd.sport_id, sportDetailIndex: sdIndex, type: typeof sd.sport_id });
                    throw new Error(`Unexpected sport_id format at index ${sdIndex}`);
                }
                return {
                    ...sd,
                    sport_id: sportId,
                    images: sd.images?.map((img, imgIndex) => {
                        logger_1.logger.info('Checking image URL', {
                            sportIndex: sdIndex,
                            imageIndex: imgIndex,
                            imageUrl: img.url,
                            urlMapHasUrl: urlMap.has(img.url),
                            urlMapKeys: Array.from(urlMap.keys()).slice(0, 3) // Log first 3 keys for debugging
                        });
                        if (urlMap.has(img.url)) {
                            const newUrl = urlMap.get(img.url);
                            // Only update if URL actually changed (not a blob URL or already permanent)
                            if (newUrl && newUrl !== img.url && !newUrl.startsWith('blob:')) {
                                hasUpdates = true;
                                sportDetailsHasUpdates = true;
                                logger_1.logger.info('Image URL updated', {
                                    sportIndex: sdIndex,
                                    imageIndex: imgIndex,
                                    old: img.url,
                                    new: newUrl,
                                    uniqueId: img.unique_id
                                });
                                return { ...img, url: newUrl };
                            }
                            else {
                                logger_1.logger.warn('Image URL not updated - conditions not met', {
                                    sportIndex: sdIndex,
                                    imageIndex: imgIndex,
                                    old: img.url,
                                    new: newUrl,
                                    isBlob: newUrl?.startsWith('blob:'),
                                    isSame: newUrl === img.url
                                });
                            }
                        }
                        else {
                            logger_1.logger.warn('Image URL not found in urlMap', {
                                sportIndex: sdIndex,
                                imageIndex: imgIndex,
                                imageUrl: img.url
                            });
                        }
                        return img;
                    }),
                    videos: sd.videos?.map((vid, vidIndex) => {
                        const updates = { ...vid };
                        logger_1.logger.info('Checking video URL', {
                            sportIndex: sdIndex,
                            videoIndex: vidIndex,
                            videoUrl: vid.url,
                            urlMapHasUrl: urlMap.has(vid.url)
                        });
                        // Update video URL if moved
                        if (urlMap.has(vid.url)) {
                            const newUrl = urlMap.get(vid.url);
                            if (newUrl && newUrl !== vid.url && !newUrl.startsWith('blob:')) {
                                updates.url = newUrl;
                                hasUpdates = true;
                                sportDetailsHasUpdates = true;
                                logger_1.logger.info('Video URL updated', {
                                    sportIndex: sdIndex,
                                    videoIndex: vidIndex,
                                    old: vid.url,
                                    new: newUrl
                                });
                            }
                            else {
                                logger_1.logger.warn('Video URL not updated - conditions not met', {
                                    sportIndex: sdIndex,
                                    videoIndex: vidIndex,
                                    old: vid.url,
                                    new: newUrl,
                                    isBlob: newUrl?.startsWith('blob:'),
                                    isSame: newUrl === vid.url
                                });
                            }
                        }
                        else {
                            logger_1.logger.warn('Video URL not found in urlMap', {
                                sportIndex: sdIndex,
                                videoIndex: vidIndex,
                                videoUrl: vid.url
                            });
                        }
                        // Update thumbnail URL if moved
                        if (vid.thumbnail && urlMap.has(vid.thumbnail)) {
                            const newThumbnailUrl = urlMap.get(vid.thumbnail);
                            if (newThumbnailUrl && newThumbnailUrl !== vid.thumbnail && !newThumbnailUrl.startsWith('blob:')) {
                                updates.thumbnail = newThumbnailUrl;
                                hasUpdates = true;
                                sportDetailsHasUpdates = true;
                                logger_1.logger.info('Video thumbnail URL updated', {
                                    sportIndex: sdIndex,
                                    videoIndex: vidIndex,
                                    old: vid.thumbnail,
                                    new: newThumbnailUrl
                                });
                            }
                        }
                        return updates;
                    })
                };
            });
            // Always set sport_details in updateQuery if there were any updates
            if (sportDetailsHasUpdates) {
                updateQuery.sport_details = updatedSportDetails;
                logger_1.logger.info('Sport details will be updated', {
                    sportDetailsCount: updatedSportDetails.length,
                    sportDetailsHasUpdates
                });
            }
            else {
                logger_1.logger.info('Sport details unchanged, skipping update');
            }
        }
        // Update documents with new URLs and regenerate unique_ids
        if (coachingCenter.documents) {
            updateQuery.documents = coachingCenter.documents.map((doc, docIndex) => {
                if (urlMap.has(doc.url)) {
                    const newUrl = urlMap.get(doc.url);
                    // Only update if URL changed and it's not a blob URL
                    if (newUrl && newUrl !== doc.url && !newUrl.startsWith('blob:')) {
                        hasUpdates = true;
                        logger_1.logger.info('Document URL updated', {
                            docIndex,
                            old: doc.url,
                            new: newUrl,
                            uniqueId: doc.unique_id
                        });
                        return { ...doc, url: newUrl };
                    }
                }
                return doc;
            });
        }
        if (!hasUpdates) {
            logger_1.logger.warn('No updates to apply after moving media files', {
                coachingCenterId: coachingCenterId.toString(),
                urlMapSize: urlMap.size
            });
            return;
        }
        logger_1.logger.info('Updating coaching center with moved media files', {
            coachingCenterId: coachingCenterId.toString(),
            updateQuery: JSON.stringify(updateQuery)
        });
        // Use getQueryById helper to handle both ObjectId and UUID string
        const query = (0, exports.getQueryById)(coachingCenterId.toString());
        const result = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, { $set: updateQuery }, { new: true });
        if (!result) {
            logger_1.logger.error('Failed to update coaching center - document not found', {
                coachingCenterId: coachingCenterId.toString()
            });
            throw new Error(`Coaching center with ID ${coachingCenterId} not found`);
        }
        logger_1.logger.info('Successfully moved media files to permanent location', {
            coachingCenterId: coachingCenterId.toString(),
            updatedFields: Object.keys(updateQuery)
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to move media to permanent', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            coachingCenterId: coachingCenter?._id || coachingCenter?.id
        });
        // Re-throw the error so the caller knows it failed
        throw error;
    }
};
exports.moveMediaFilesToPermanent = moveMediaFilesToPermanent;
/**
 * Validate required fields for publishing
 */
const validatePublishStatus = (data, _isAdmin = false) => {
    if (!data.center_name?.trim())
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.centerName.required'));
    if (!data.mobile_number || !/^[6-9]\d{9}$/.test(data.mobile_number))
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.mobileNumber.required'));
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.email.required'));
    if (!data.logo)
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.logo.required'));
    if (!data.sports?.length)
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.coachingCenter.sports.minOne'));
    if (!data.sport_details?.length)
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.coachingCenter.sports.minOne'));
    data.sport_details.forEach((sd, i) => {
        if (!sd.sport_id)
            throw new ApiError_1.ApiError(400, `${(0, i18n_1.t)('validation.coachingCenter.sports.required')} [${i}]`);
        if (!sd.description?.trim() || sd.description.length < 5)
            throw new ApiError_1.ApiError(400, `${(0, i18n_1.t)('coachingCenter.description.minLength')} [${i}]`);
    });
    if (!data.age?.min || !data.age?.max)
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.age.minRequired'));
    if (!data.location?.latitude || !data.location?.longitude || !data.location?.address)
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.location.latitudeRequired'));
    // Bank information is optional for both academy and admin.
};
exports.validatePublishStatus = validatePublishStatus;
/**
 * Resolve facilities from input
 */
const resolveFacilities = async (facilityInput) => {
    const promises = facilityInput.map(async (input) => {
        if (typeof input === 'string') {
            if (!mongoose_1.Types.ObjectId.isValid(input))
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.facility.invalidId', { id: input }));
            const exists = await facility_model_1.FacilityModel.findOne({
                _id: input,
                isDeleted: { $ne: true }, // Exclude soft-deleted facilities
            });
            if (!exists)
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.facility.notFound', { id: input }));
            return new mongoose_1.Types.ObjectId(input);
        }
        const id = await (0, facility_service_1.findOrCreateFacility)(input);
        if (!id)
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.facility.createFailed'));
        return id;
    });
    return await Promise.all(promises);
};
exports.resolveFacilities = resolveFacilities;
/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
const removeMediaFromCoachingCenter = async (coachingCenterId, mediaType, uniqueId, sportId // Required for image/video (sport-specific media)
) => {
    try {
        const query = (0, exports.getQueryById)(coachingCenterId);
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!coachingCenter || coachingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const now = new Date();
        if (mediaType === 'logo') {
            // Soft delete logo
            coachingCenter.logo = null;
            await coachingCenter.save({ validateBeforeSave: false });
            logger_1.logger.info('Logo soft deleted from coaching center', { coachingCenterId });
            return;
        }
        if (mediaType === 'document') {
            // Soft delete document from general documents array
            const documentIndex = coachingCenter.documents?.findIndex((doc) => doc.unique_id === uniqueId && !doc.is_deleted);
            if (documentIndex === -1 || documentIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (coachingCenter.documents && coachingCenter.documents[documentIndex]) {
                coachingCenter.documents[documentIndex].is_deleted = true;
                coachingCenter.documents[documentIndex].deletedAt = now;
                coachingCenter.markModified('documents');
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Document soft deleted from coaching center', {
                    coachingCenterId,
                    uniqueId,
                });
            }
            return;
        }
        // For image/video, sportId is required
        if ((mediaType === 'image' || mediaType === 'video') && !sportId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.sportIdRequired'));
        }
        // Find sport detail by sport_id
        const sportDetailIndex = coachingCenter.sport_details?.findIndex((detail) => detail.sport_id.toString() === sportId);
        if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.sportDetailNotFound'));
        }
        const sportDetail = coachingCenter.sport_details[sportDetailIndex];
        if (mediaType === 'image') {
            // Soft delete image from sport_details
            const imageIndex = sportDetail.images?.findIndex((img) => img.unique_id === uniqueId && !img.is_deleted);
            if (imageIndex === -1 || imageIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (sportDetail.images && sportDetail.images[imageIndex]) {
                sportDetail.images[imageIndex].is_deleted = true;
                sportDetail.images[imageIndex].deletedAt = now;
                coachingCenter.markModified(`sport_details.${sportDetailIndex}.images`);
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Image soft deleted from coaching center', {
                    coachingCenterId,
                    sportId,
                    uniqueId,
                });
            }
            return;
        }
        if (mediaType === 'video') {
            // Soft delete video from sport_details
            const videoIndex = sportDetail.videos?.findIndex((video) => video.unique_id === uniqueId && !video.is_deleted);
            if (videoIndex === -1 || videoIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (sportDetail.videos && sportDetail.videos[videoIndex]) {
                sportDetail.videos[videoIndex].is_deleted = true;
                sportDetail.videos[videoIndex].deletedAt = now;
                coachingCenter.markModified(`sport_details.${sportDetailIndex}.videos`);
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Video soft deleted from coaching center', {
                    coachingCenterId,
                    sportId,
                    uniqueId,
                });
            }
            return;
        }
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.invalidType'));
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to remove media from coaching center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.media.removeFailed'));
    }
};
exports.removeMediaFromCoachingCenter = removeMediaFromCoachingCenter;
/**
 * Set an image as banner for coaching center
 * Only one image can be banner at a time - unsets all other banner flags
 */
const setBannerImage = async (coachingCenterId, sportId, imageUniqueId) => {
    try {
        const query = (0, exports.getQueryById)(coachingCenterId);
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!coachingCenter || coachingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        // Find sport detail by sport_id
        const sportDetailIndex = coachingCenter.sport_details?.findIndex((detail) => detail.sport_id.toString() === sportId);
        if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.sportDetailNotFound'));
        }
        const sportDetail = coachingCenter.sport_details[sportDetailIndex];
        // Find the image
        const imageIndex = sportDetail.images?.findIndex((img) => img.unique_id === imageUniqueId && !img.is_deleted);
        if (imageIndex === -1 || imageIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
        }
        // Unset all other banner flags across all sport_details
        if (coachingCenter.sport_details) {
            let hasChanges = false;
            coachingCenter.sport_details.forEach((sd, sdIdx) => {
                if (sd.images) {
                    sd.images.forEach((img, imgIdx) => {
                        if (img.is_banner && !(sdIdx === sportDetailIndex && imgIdx === imageIndex)) {
                            img.is_banner = false;
                            hasChanges = true;
                        }
                    });
                }
            });
            if (hasChanges) {
                coachingCenter.markModified('sport_details');
            }
        }
        // Set the selected image as banner
        sportDetail.images[imageIndex].is_banner = true;
        coachingCenter.markModified('sport_details');
        await coachingCenter.save({ validateBeforeSave: false });
        logger_1.logger.info('Banner image set for coaching center', {
            coachingCenterId: coachingCenterId.toString(),
            sportId,
            imageUniqueId,
        });
        return await (0, exports.getCoachingCenterById)(coachingCenterId);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to set banner image', { error, coachingCenterId, sportId, imageUniqueId });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.media.setBannerFailed'));
    }
};
exports.setBannerImage = setBannerImage;
/**
 * Upload thumbnail file to S3
 */
const uploadThumbnailFile = async (file) => {
    try {
        const thumbnailUrl = await mediaService.uploadMediaFile({
            file,
            mediaType: 'image', // Thumbnails are images
        });
        return thumbnailUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload thumbnail file', { error });
        throw new ApiError_1.ApiError(500, 'Failed to upload thumbnail file');
    }
};
exports.uploadThumbnailFile = uploadThumbnailFile;
/**
 * Upload and set video thumbnail
 */
const uploadVideoThumbnail = async (coachingCenterId, sportId, videoUniqueId, thumbnailUrl) => {
    try {
        const query = (0, exports.getQueryById)(coachingCenterId);
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
        if (!coachingCenter || coachingCenter.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        // Find sport detail by sport_id
        const sportDetailIndex = coachingCenter.sport_details?.findIndex((detail) => detail.sport_id.toString() === sportId);
        if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.sportDetailNotFound'));
        }
        const sportDetail = coachingCenter.sport_details[sportDetailIndex];
        // Find the video
        const videoIndex = sportDetail.videos?.findIndex((vid) => vid.unique_id === videoUniqueId && !vid.is_deleted);
        if (videoIndex === -1 || videoIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
        }
        // Update thumbnail URL
        sportDetail.videos[videoIndex].thumbnail = thumbnailUrl;
        coachingCenter.markModified(`sport_details.${sportDetailIndex}.videos`);
        await coachingCenter.save({ validateBeforeSave: false });
        logger_1.logger.info('Video thumbnail uploaded for coaching center', {
            coachingCenterId: coachingCenterId.toString(),
            sportId,
            videoUniqueId,
            thumbnailUrl,
        });
        return await (0, exports.getCoachingCenterById)(coachingCenterId);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to upload video thumbnail', { error, coachingCenterId, sportId, videoUniqueId });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.media.uploadThumbnailFailed'));
    }
};
exports.uploadVideoThumbnail = uploadVideoThumbnail;
//# sourceMappingURL=coachingCenterCommon.service.js.map