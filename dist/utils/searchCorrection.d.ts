/**
 * Search query auto-correction and normalization.
 * - Normalizes phrases like "cricket academy near me", "popular cricket academy near me" to core terms ("cricket academy").
 * - Corrects typos using a dictionary (sport names, center names, cities, etc.): "cricaket acaemy" -> "cricket academy".
 */
/**
 * Normalize "X and Y" to "X&Y" so "s and s" matches academy name "S&S Football Academy".
 */
export declare function normalizeAndToAmpersand(query: string): string;
/**
 * Normalize search query by removing "near me", "popular", "best", etc.
 * So "popular cricket academy near me" → "cricket academy", "cricaket acaemy near me" → "cricaket acaemy".
 * Client should send latitude/longitude for "near me" to get distance-based results.
 */
export declare function normalizeSearchQuery(query: string): string;
export interface SearchCorrectionResult {
    corrected: string;
    wasCorrected: boolean;
    /** Per-word corrections for UI (e.g. "criket" -> "cricket") */
    corrections?: Array<{
        original: string;
        corrected: string;
    }>;
}
/**
 * Corrects search query by matching words against a dictionary (e.g. sport names).
 * Words with length >= 3 that are close to a dictionary term are replaced.
 *
 * @param query - User's raw search query
 * @param dictionary - List of known terms (e.g. sport names). Will be lowercased for matching.
 * @returns Corrected query and whether any correction was applied
 */
export declare function getCorrectedSearchQuery(query: string, dictionary: string[]): SearchCorrectionResult;
export interface SearchDictionarySources {
    sportNames?: string[];
    centerNames?: string[];
    cities?: string[];
    stateNames?: string[];
    /** Optional: unique words from center names (e.g. "Academy", "Elite") - if not set, derived from centerNames */
    descriptionWords?: string[];
}
/**
 * Build a single dictionary array from sport names, coaching center names, cities, states, etc.
 * Used for auto-correct so queries can match "criket" -> "cricket", "acadmy" -> "academy", "mumba" -> "Mumbai".
 */
export declare function buildSearchDictionary(sources: SearchDictionarySources): string[];
//# sourceMappingURL=searchCorrection.d.ts.map