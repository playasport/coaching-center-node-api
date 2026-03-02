"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meilisearchIndexing = exports.MEILISEARCH_INDICES = void 0;
const meilisearch_client_1 = require("./meilisearch.client");
const logger_1 = require("../../utils/logger");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const sport_model_1 = require("../../models/sport.model");
const reel_model_1 = require("../../models/reel.model");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Meilisearch Index Names
 */
exports.MEILISEARCH_INDICES = {
    SPORTS: 'sports_index',
    COACHING_CENTRES: 'coaching_centres_index',
    REELS: 'reels_index',
    LIVE_STREAMS: 'live_streams_index', // For highlights/streams
};
/**
 * Indexing Service for Meilisearch
 * Handles indexing of all models
 */
class MeilisearchIndexingService {
    /**
     * Check if indexing is enabled
     */
    isIndexingEnabled() {
        return meilisearch_client_1.meilisearchClient.isEnabled();
    }
    /**
     * Index a single document
     */
    async indexDocument(indexName, document, primaryKey = 'id') {
        if (!this.isIndexingEnabled()) {
            return false;
        }
        const client = meilisearch_client_1.meilisearchClient.getClient();
        if (!client) {
            return false;
        }
        try {
            const index = client.index(indexName);
            await index.addDocuments([document], { primaryKey });
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to index document in ${indexName}:`, error);
            return false;
        }
    }
    /**
     * Delete a document
     */
    async deleteDocument(indexName, documentId) {
        if (!this.isIndexingEnabled()) {
            return false;
        }
        const client = meilisearch_client_1.meilisearchClient.getClient();
        if (!client) {
            return false;
        }
        try {
            const index = client.index(indexName);
            await index.deleteDocument(documentId);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete document from ${indexName}:`, error);
            return false;
        }
    }
    /**
     * Transform Coaching Center to Meilisearch document
     */
    transformCoachingCenter(center) {
        const location = center.location || {};
        const sports = center.sports || [];
        const sportDetails = center.sport_details || [];
        const facilities = center.facility || [];
        // Get sports names from populated sports or sport_details
        const sportsNames = [];
        if (Array.isArray(sports)) {
            sports.forEach((sport) => {
                if (typeof sport === 'object' && sport.name) {
                    sportsNames.push(sport.name);
                }
                else if (typeof sport === 'string') {
                    sportsNames.push(sport);
                }
            });
        }
        // Get facility names
        const facilityNames = [];
        if (Array.isArray(facilities)) {
            facilities.forEach((facility) => {
                if (typeof facility === 'object' && facility.name) {
                    facilityNames.push(facility.name);
                }
                else if (typeof facility === 'string') {
                    facilityNames.push(facility);
                }
            });
        }
        // Get sports IDs
        const sportsIds = [];
        if (Array.isArray(sports)) {
            sports.forEach((sport) => {
                if (typeof sport === 'object' && sport._id) {
                    sportsIds.push(sport._id.toString());
                }
                else if (sport instanceof mongoose_1.default.Types.ObjectId) {
                    sportsIds.push(sport.toString());
                }
            });
        }
        // Get facility IDs
        const facilityIds = [];
        if (Array.isArray(facilities)) {
            facilities.forEach((facility) => {
                if (typeof facility === 'object' && facility._id) {
                    facilityIds.push(facility._id.toString());
                }
                else if (facility instanceof mongoose_1.default.Types.ObjectId) {
                    facilityIds.push(facility.toString());
                }
            });
        }
        // Get images from sport_details - prioritize is_banner, limit to 2
        // If no images available, use logo as fallback
        const allImages = [];
        const logoUrl = center.logo || null;
        if (Array.isArray(sportDetails)) {
            sportDetails.forEach((detail) => {
                if (Array.isArray(detail.images)) {
                    // Filter active, non-deleted images and exclude logo if it matches
                    const validImages = detail.images.filter((img) => {
                        if (typeof img === 'string') {
                            // Exclude if it matches the logo URL
                            return logoUrl ? img !== logoUrl : true;
                        }
                        const isActive = img.is_active !== false && img.is_deleted !== true && !img.deletedAt;
                        if (!isActive)
                            return false;
                        // Exclude if image URL matches logo URL
                        const imgUrl = img.url || '';
                        return logoUrl ? imgUrl !== logoUrl : true;
                    });
                    allImages.push(...validImages);
                }
            });
        }
        // Sort: is_banner=true first, then others, then take only 2
        allImages.sort((a, b) => {
            const aIsBanner = typeof a === 'object' && a.is_banner === true ? 1 : 0;
            const bIsBanner = typeof b === 'object' && b.is_banner === true ? 1 : 0;
            return bIsBanner - aIsBanner; // Banner images first
        });
        // Take only 2 images and convert to URL strings
        let images = allImages.slice(0, 2).map((img) => {
            if (typeof img === 'string')
                return img;
            return img.url || '';
        }).filter((url) => url && url.trim() !== '');
        // If no images found and logo exists, use logo as fallback
        if (images.length === 0 && logoUrl) {
            images = [logoUrl];
        }
        const latitude = location.latitude || location.lat || null;
        const longitude = location.longitude || location.long || null;
        return {
            id: center.id || center._id?.toString(),
            name: center.center_name || '',
            coaching_name: center.center_name || '',
            description: sportDetails
                .map((d) => d.description || '')
                .filter((d) => d)
                .join(' ') || '',
            bio: sportDetails
                .map((d) => d.description || '')
                .filter((d) => d)
                .join(' ') || '',
            address: location.address || '',
            address_line1: location.address_line1 || '',
            address_line2: location.address_line2 || '',
            latitude: latitude,
            longitude: longitude,
            lat: latitude,
            long: longitude,
            _geo: latitude && longitude ? { lat: latitude, lng: longitude } : null,
            logo: center.logo || null,
            images: images,
            allowed_gender: center.allowed_genders || [],
            sports_names: sportsNames,
            location_name: location.location_name || '',
            experience: center.experience || 0,
            pincode: location.pincode || null,
            is_active: center.is_active !== false,
            is_admin_approve: center.approval_status === 'approved',
            approval_status: center.approval_status || 'pending_approval',
            average_rating: center.averageRating ?? 0,
            total_ratings: center.totalRatings ?? 0,
            created_at: center.createdAt || new Date(),
            updated_at: center.updatedAt || new Date(),
        };
    }
    /**
     * Transform Sport to Meilisearch document
     */
    transformSport(sport) {
        return {
            id: sport.custom_id || sport._id?.toString(),
            name: sport.name || '',
            title: sport.name || '',
            sport_id: sport.custom_id || sport._id?.toString(),
            sport_name: sport.name || '',
            sport_logo: sport.logo || null,
            logo: sport.logo || null,
            images: sport.images || [],
            videos: sport.videos || [],
            description: sport.description || sport.bio || '',
            bio: sport.description || sport.bio || '',
            has_sport_bio: !!(sport.description || sport.bio),
            is_active: sport.is_active !== false,
            is_popular: sport.is_popular || false,
            created_at: sport.createdAt || new Date(),
            updated_at: sport.updatedAt || new Date(),
        };
    }
    /**
     * Transform Reel to Meilisearch document
     */
    transformReel(reel) {
        return {
            id: reel.id || reel._id?.toString(),
            name: reel.title || '',
            title: reel.title || '',
            description: reel.description || '',
            thumbnail: reel.thumbnailPath || null,
            thumbnailUrl: reel.thumbnailPath || null,
            video_url: reel.previewUrl || reel.masterM3u8Url || reel.originalPath || null,
            videoUrl: reel.previewUrl || reel.masterM3u8Url || reel.originalPath || null,
            views: reel.viewsCount || 0,
            views_count: reel.viewsCount || 0,
            likes: reel.likesCount || 0,
            likes_count: reel.likesCount || 0,
            comments: reel.commentsCount || 0,
            comments_count: reel.commentsCount || 0,
            status: reel.status || 'published',
            created_at: reel.createdAt || new Date(),
            updated_at: reel.updatedAt || new Date(),
        };
    }
    /**
     * Transform Stream Highlight to Meilisearch document
     */
    transformStreamHighlight(highlight) {
        return {
            id: highlight.id || highlight._id?.toString(),
            name: highlight.title || '',
            title: highlight.title || '',
            description: highlight.description || '',
            thumbnail: highlight.thumbnailUrl || null,
            thumbnailUrl: highlight.thumbnailUrl || null,
            video_url: highlight.videoUrl || highlight.previewUrl || highlight.masterM3u8Url || null,
            videoUrl: highlight.videoUrl || highlight.previewUrl || highlight.masterM3u8Url || null,
            stream_key: highlight.streamSessionId?.toString() || null,
            views: highlight.viewsCount || 0,
            views_count: highlight.viewsCount || 0,
            likes: highlight.likesCount || 0,
            likes_count: highlight.likesCount || 0,
            comments: highlight.commentsCount || 0,
            comments_count: highlight.commentsCount || 0,
            status: highlight.status || 'published',
            duration: highlight.duration || 0,
            created_at: highlight.createdAt || new Date(),
            updated_at: highlight.updatedAt || new Date(),
        };
    }
    /**
     * Index Coaching Center
     */
    async indexCoachingCenter(centerId) {
        try {
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
                $or: [{ id: centerId }, { _id: centerId }],
                is_deleted: false,
            })
                .populate('sports', 'name custom_id')
                .populate('facility', 'name')
                .lean();
            if (!center) {
                logger_1.logger.warn(`Coaching center not found: ${centerId}`);
                return false;
            }
            // Only index approved and active centers
            if (center.approval_status !== 'approved' || !center.is_active) {
                // Delete from index if exists
                await this.deleteCoachingCenter(centerId);
                return false;
            }
            const document = this.transformCoachingCenter(center);
            return await this.indexDocument(exports.MEILISEARCH_INDICES.COACHING_CENTRES, document);
        }
        catch (error) {
            logger_1.logger.error(`Failed to index coaching center ${centerId}:`, error);
            return false;
        }
    }
    /**
     * Update Coaching Center in index
     */
    async updateCoachingCenter(centerId) {
        return await this.indexCoachingCenter(centerId);
    }
    /**
     * Delete Coaching Center from index
     */
    async deleteCoachingCenter(centerId) {
        return await this.deleteDocument(exports.MEILISEARCH_INDICES.COACHING_CENTRES, centerId);
    }
    /**
     * Index Sport
     */
    async indexSport(sportId) {
        try {
            const sport = await sport_model_1.SportModel.findOne({
                $or: [{ custom_id: sportId }, { _id: sportId }],
            }).lean();
            if (!sport) {
                logger_1.logger.warn(`Sport not found: ${sportId}`);
                return false;
            }
            // Only index active sports
            if (!sport.is_active) {
                await this.deleteSport(sportId);
                return false;
            }
            const document = this.transformSport(sport);
            return await this.indexDocument(exports.MEILISEARCH_INDICES.SPORTS, document, 'id');
        }
        catch (error) {
            logger_1.logger.error(`Failed to index sport ${sportId}:`, error);
            return false;
        }
    }
    /**
     * Update Sport in index
     */
    async updateSport(sportId) {
        return await this.indexSport(sportId);
    }
    /**
     * Delete Sport from index
     */
    async deleteSport(sportId) {
        return await this.deleteDocument(exports.MEILISEARCH_INDICES.SPORTS, sportId);
    }
    /**
     * Index Reel
     */
    async indexReel(reelId) {
        try {
            const reel = await reel_model_1.ReelModel.findOne({
                $or: [{ id: reelId }, { _id: reelId }],
                deletedAt: null,
            }).lean();
            if (!reel) {
                logger_1.logger.warn(`Reel not found: ${reelId}`);
                return false;
            }
            // Only index approved reels (status must be 'approved')
            if (reel.status !== 'approved') {
                await this.deleteReel(reelId);
                return false;
            }
            const document = this.transformReel(reel);
            return await this.indexDocument(exports.MEILISEARCH_INDICES.REELS, document);
        }
        catch (error) {
            logger_1.logger.error(`Failed to index reel ${reelId}:`, error);
            return false;
        }
    }
    /**
     * Update Reel in index
     */
    async updateReel(reelId) {
        return await this.indexReel(reelId);
    }
    /**
     * Delete Reel from index
     */
    async deleteReel(reelId) {
        return await this.deleteDocument(exports.MEILISEARCH_INDICES.REELS, reelId);
    }
    /**
     * Index Stream Highlight
     */
    async indexStreamHighlight(highlightId) {
        try {
            const highlight = await streamHighlight_model_1.StreamHighlightModel.findOne({
                $or: [{ id: highlightId }, { _id: highlightId }],
                deletedAt: null,
            }).lean();
            if (!highlight) {
                logger_1.logger.warn(`Stream highlight not found: ${highlightId}`);
                return false;
            }
            // Only index published highlights
            if (highlight.status !== 'published') {
                await this.deleteStreamHighlight(highlightId);
                return false;
            }
            const document = this.transformStreamHighlight(highlight);
            return await this.indexDocument(exports.MEILISEARCH_INDICES.LIVE_STREAMS, document);
        }
        catch (error) {
            logger_1.logger.error(`Failed to index stream highlight ${highlightId}:`, error);
            return false;
        }
    }
    /**
     * Update Stream Highlight in index
     */
    async updateStreamHighlight(highlightId) {
        return await this.indexStreamHighlight(highlightId);
    }
    /**
     * Delete Stream Highlight from index
     */
    async deleteStreamHighlight(highlightId) {
        return await this.deleteDocument(exports.MEILISEARCH_INDICES.LIVE_STREAMS, highlightId);
    }
    /**
     * Re-index all coaching centers
     */
    async reindexAllCoachingCenters() {
        if (!this.isIndexingEnabled()) {
            logger_1.logger.info('Meilisearch indexing is disabled');
            return { success: 0, failed: 0 };
        }
        let success = 0;
        let failed = 0;
        try {
            const centers = await coachingCenter_model_1.CoachingCenterModel.find({
                is_deleted: false,
                approval_status: 'approved',
                is_active: true,
            })
                .populate('sports', 'name custom_id')
                .populate('facility', 'name')
                .lean();
            const client = meilisearch_client_1.meilisearchClient.getClient();
            if (!client) {
                throw new Error('Meilisearch client not available');
            }
            const index = client.index(exports.MEILISEARCH_INDICES.COACHING_CENTRES);
            const documents = centers.map((center) => this.transformCoachingCenter(center));
            if (documents.length > 0) {
                await index.addDocuments(documents, { primaryKey: 'id' });
                success = documents.length;
                logger_1.logger.info(`Re-indexed ${success} coaching centers`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to re-index coaching centers:', error);
            failed = 1;
        }
        return { success, failed };
    }
    /**
     * Re-index all sports
     */
    async reindexAllSports() {
        if (!this.isIndexingEnabled()) {
            logger_1.logger.info('Meilisearch indexing is disabled');
            return { success: 0, failed: 0 };
        }
        let success = 0;
        let failed = 0;
        try {
            const sports = await sport_model_1.SportModel.find({ is_active: true }).lean();
            const client = meilisearch_client_1.meilisearchClient.getClient();
            if (!client) {
                throw new Error('Meilisearch client not available');
            }
            const index = client.index(exports.MEILISEARCH_INDICES.SPORTS);
            const documents = sports.map((sport) => this.transformSport(sport));
            if (documents.length > 0) {
                await index.addDocuments(documents, { primaryKey: 'id' });
                success = documents.length;
                logger_1.logger.info(`Re-indexed ${success} sports`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to re-index sports:', error);
            failed = 1;
        }
        return { success, failed };
    }
    /**
     * Re-index all reels
     */
    async reindexAllReels() {
        if (!this.isIndexingEnabled()) {
            logger_1.logger.info('Meilisearch indexing is disabled');
            return { success: 0, failed: 0 };
        }
        let success = 0;
        let failed = 0;
        try {
            const reels = await reel_model_1.ReelModel.find({
                deletedAt: null,
                status: 'approved', // Only index approved reels
            }).lean();
            const client = meilisearch_client_1.meilisearchClient.getClient();
            if (!client) {
                throw new Error('Meilisearch client not available');
            }
            const index = client.index(exports.MEILISEARCH_INDICES.REELS);
            const documents = reels.map((reel) => this.transformReel(reel));
            if (documents.length > 0) {
                await index.addDocuments(documents, { primaryKey: 'id' });
                success = documents.length;
                logger_1.logger.info(`Re-indexed ${success} reels`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to re-index reels:', error);
            failed = 1;
        }
        return { success, failed };
    }
    /**
     * Re-index all stream highlights
     */
    async reindexAllStreamHighlights() {
        if (!this.isIndexingEnabled()) {
            logger_1.logger.info('Meilisearch indexing is disabled');
            return { success: 0, failed: 0 };
        }
        let success = 0;
        let failed = 0;
        try {
            const highlights = await streamHighlight_model_1.StreamHighlightModel.find({
                deletedAt: null,
                status: 'published',
            }).lean();
            const client = meilisearch_client_1.meilisearchClient.getClient();
            if (!client) {
                throw new Error('Meilisearch client not available');
            }
            const index = client.index(exports.MEILISEARCH_INDICES.LIVE_STREAMS);
            const documents = highlights.map((highlight) => this.transformStreamHighlight(highlight));
            if (documents.length > 0) {
                await index.addDocuments(documents, { primaryKey: 'id' });
                success = documents.length;
                logger_1.logger.info(`Re-indexed ${success} stream highlights`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to re-index stream highlights:', error);
            failed = 1;
        }
        return { success, failed };
    }
    /**
     * Re-index all indices
     */
    async reindexAll() {
        logger_1.logger.info('Starting full re-indexing of all Meilisearch indices...');
        const [coachingCenters, sports, reels, streamHighlights] = await Promise.all([
            this.reindexAllCoachingCenters(),
            this.reindexAllSports(),
            this.reindexAllReels(),
            this.reindexAllStreamHighlights(),
        ]);
        logger_1.logger.info('Full re-indexing completed');
        return {
            coaching_centers: coachingCenters,
            sports,
            reels,
            stream_highlights: streamHighlights,
        };
    }
    /**
     * Configure index settings (searchable attributes, filterable attributes, etc.)
     */
    async configureIndices() {
        if (!this.isIndexingEnabled()) {
            return false;
        }
        const client = meilisearch_client_1.meilisearchClient.getClient();
        if (!client) {
            return false;
        }
        try {
            // Configure Coaching Centres Index
            const coachingIndex = client.index(exports.MEILISEARCH_INDICES.COACHING_CENTRES);
            await coachingIndex.updateSettings({
                searchableAttributes: [
                    'name',
                    'coaching_name',
                    'description',
                    'bio',
                    'address',
                    'city',
                    'city_name',
                    'state',
                    'state_name',
                    'sports_names',
                    'facilities',
                ],
                filterableAttributes: [
                    'is_active',
                    'is_admin_approve',
                    'approval_status',
                    'city_id',
                    'state_id',
                    'sports_ids',
                    'facility_ids',
                ],
                sortableAttributes: ['rating', 'review_count', 'created_at', 'updated_at'],
                displayedAttributes: [
                    'id',
                    'name',
                    'coaching_name',
                    'description',
                    'bio',
                    'address',
                    'city',
                    'city_name',
                    'city_id',
                    'state',
                    'state_id',
                    'state_name',
                    'latitude',
                    'longitude',
                    'lat',
                    'long',
                    '_geo',
                    'logo',
                    'images',
                    'rating',
                    'average_rating',
                    'review_count',
                    'allowed_gender',
                    'sports',
                    'sports_ids',
                    'sports_names',
                    'facilities',
                    'facility_ids',
                    'location_name',
                    'experience',
                    'pincode',
                    'created_at',
                    'updated_at',
                ],
            });
            // Configure Sports Index
            const sportsIndex = client.index(exports.MEILISEARCH_INDICES.SPORTS);
            await sportsIndex.updateSettings({
                searchableAttributes: ['name', 'title', 'description', 'bio'],
                filterableAttributes: ['is_active', 'is_popular'],
                sortableAttributes: ['name', 'created_at', 'updated_at'],
                displayedAttributes: [
                    'id',
                    'name',
                    'title',
                    'sport_id',
                    'sport_name',
                    'sport_logo',
                    'logo',
                    'images',
                    'videos',
                    'description',
                    'bio',
                    'has_sport_bio',
                    'is_active',
                    'is_popular',
                    'created_at',
                    'updated_at',
                ],
            });
            // Configure Reels Index
            const reelsIndex = client.index(exports.MEILISEARCH_INDICES.REELS);
            await reelsIndex.updateSettings({
                searchableAttributes: ['name', 'title', 'description'],
                filterableAttributes: ['status'],
                sortableAttributes: ['views', 'views_count', 'likes', 'likes_count', 'created_at', 'updated_at'],
                displayedAttributes: [
                    'id',
                    'name',
                    'title',
                    'description',
                    'thumbnail',
                    'thumbnailUrl',
                    'video_url',
                    'videoUrl',
                    'views',
                    'views_count',
                    'likes',
                    'likes_count',
                    'comments',
                    'comments_count',
                    'status',
                    'created_at',
                    'updated_at',
                ],
            });
            // Configure Live Streams Index
            const streamsIndex = client.index(exports.MEILISEARCH_INDICES.LIVE_STREAMS);
            await streamsIndex.updateSettings({
                searchableAttributes: ['name', 'title', 'description'],
                filterableAttributes: ['status'],
                sortableAttributes: ['views', 'views_count', 'likes', 'likes_count', 'created_at', 'updated_at'],
                displayedAttributes: [
                    'id',
                    'name',
                    'title',
                    'description',
                    'thumbnail',
                    'thumbnailUrl',
                    'video_url',
                    'videoUrl',
                    'stream_key',
                    'views',
                    'views_count',
                    'likes',
                    'likes_count',
                    'comments',
                    'comments_count',
                    'status',
                    'duration',
                    'created_at',
                    'updated_at',
                ],
            });
            logger_1.logger.info('Meilisearch indices configured successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to configure Meilisearch indices:', error);
            return false;
        }
    }
}
exports.meilisearchIndexing = new MeilisearchIndexingService();
//# sourceMappingURL=indexing.service.js.map