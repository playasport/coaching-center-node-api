import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { SportModel } from '../../models/sport.model';
import { ReelModel, ReelStatus } from '../../models/reel.model';
import {
  StreamHighlightModel,
  HighlightStatus,
  VideoProcessingStatus,
} from '../../models/streamHighlight.model';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { logger } from '../../utils/logger';

export interface SitemapCoachingCentre {
  id: string;
  name: string;
  type: 'coaching_centre';
}

export interface SitemapSport {
  name: string;
  type: 'sport';
}

export interface SitemapReel {
  id: string;
  name: string;
  type: 'reel';
}

export interface SitemapHighlight {
  id: string;
  name: string;
  type: 'highlight';
}

export interface SitemapData {
  coaching_centres: SitemapCoachingCentre[];
  sports: SitemapSport[];
  reels: SitemapReel[];
  highlights: SitemapHighlight[];
  total_coaching_centres: number;
  total_sports: number;
  total_reels: number;
  total_highlights: number;
}

/**
 * Get sitemap data: coaching centres, sports, reels, and highlights.
 * Public endpoint for SEO/sitemap generation.
 */
export const getSitemapData = async (): Promise<SitemapData> => {
  try {
    const [coachingCentres, sports, reels, highlights] = await Promise.all([
      CoachingCenterModel.find({
        status: CoachingCenterStatus.PUBLISHED,
        is_active: true,
        is_deleted: false,
        approval_status: 'approved',
      })
        .select('id center_name')
        .sort({ createdAt: -1 })
        .lean(),
      SportModel.find({ is_active: true })
        .select('name')
        .sort({ createdAt: -1 })
        .lean(),
      ReelModel.find({
        status: ReelStatus.APPROVED,
        videoProcessingStatus: VideoProcessingStatus.COMPLETED,
        deletedAt: null,
      })
        .select('id title')
        .sort({ createdAt: -1 })
        .lean(),
      StreamHighlightModel.find({
        status: HighlightStatus.PUBLISHED,
        videoProcessingStatus: VideoProcessingStatus.COMPLETED,
        deletedAt: null,
      })
        .select('id title')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      coaching_centres: (coachingCentres as any[]).map((c) => ({
        id: c.id || String(c._id),
        name: c.center_name,
        type: 'coaching_centre' as const,
      })),
      sports: (sports as any[]).map((s) => ({
        name: s.name,
        type: 'sport' as const,
      })),
      reels: (reels as any[]).map((r) => ({
        id: r.id,
        name: r.title,
        type: 'reel' as const,
      })),
      highlights: (highlights as any[]).map((h) => ({
        id: h.id,
        name: h.title,
        type: 'highlight' as const,
      })),
      total_coaching_centres: coachingCentres.length,
      total_sports: sports.length,
      total_reels: reels.length,
      total_highlights: highlights.length,
    };
  } catch (error) {
    logger.error('Failed to get sitemap data:', error);
    throw error;
  }
};
