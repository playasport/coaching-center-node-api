"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSitemapData = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const sport_model_1 = require("../../models/sport.model");
const reel_model_1 = require("../../models/reel.model");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const coachingCenterStatus_enum_1 = require("../../enums/coachingCenterStatus.enum");
const logger_1 = require("../../utils/logger");
/**
 * Get sitemap data: coaching centres, sports, reels, and highlights.
 * Public endpoint for SEO/sitemap generation.
 */
const getSitemapData = async () => {
    try {
        const [coachingCentres, sports, reels, highlights] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.find({
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
                is_active: true,
                is_deleted: false,
                approval_status: 'approved',
            })
                .select('id center_name')
                .sort({ createdAt: -1 })
                .lean(),
            sport_model_1.SportModel.find({ is_active: true })
                .select('name')
                .sort({ createdAt: -1 })
                .lean(),
            reel_model_1.ReelModel.find({
                status: reel_model_1.ReelStatus.APPROVED,
                videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
                deletedAt: null,
            })
                .select('id title')
                .sort({ createdAt: -1 })
                .lean(),
            streamHighlight_model_1.StreamHighlightModel.find({
                status: streamHighlight_model_1.HighlightStatus.PUBLISHED,
                videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
                deletedAt: null,
            })
                .select('id title')
                .sort({ createdAt: -1 })
                .lean(),
        ]);
        return {
            coaching_centres: coachingCentres.map((c) => ({
                id: c.id || String(c._id),
                name: c.center_name,
                type: 'coaching_centre',
            })),
            sports: sports.map((s) => ({
                name: s.name,
                type: 'sport',
            })),
            reels: reels.map((r) => ({
                id: r.id,
                name: r.title,
                type: 'reel',
            })),
            highlights: highlights.map((h) => ({
                id: h.id,
                name: h.title,
                type: 'highlight',
            })),
            total_coaching_centres: coachingCentres.length,
            total_sports: sports.length,
            total_reels: reels.length,
            total_highlights: highlights.length,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get sitemap data:', error);
        throw error;
    }
};
exports.getSitemapData = getSitemapData;
//# sourceMappingURL=sitemap.service.js.map