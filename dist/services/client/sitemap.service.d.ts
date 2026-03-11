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
export declare const getSitemapData: () => Promise<SitemapData>;
//# sourceMappingURL=sitemap.service.d.ts.map