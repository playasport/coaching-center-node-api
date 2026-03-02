"use strict";
/**
 * Search query auto-correction and normalization.
 * - Normalizes phrases like "cricket academy near me", "popular cricket academy near me" to core terms ("cricket academy").
 * - Corrects typos using a dictionary (sport names, center names, cities, etc.): "cricaket acaemy" -> "cricket academy".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAndToAmpersand = normalizeAndToAmpersand;
exports.normalizeSearchQuery = normalizeSearchQuery;
exports.getCorrectedSearchQuery = getCorrectedSearchQuery;
exports.buildSearchDictionary = buildSearchDictionary;
/** Multi-word phrases to strip from search query (intent modifiers; "near me" is handled by lat/long) */
const STOP_PHRASES = [
    'near me',
    'nearby me',
    'around me',
    'close to me',
    'in my area',
    'in my city',
    'nearby',
    'popular',
    'the best',
    'best',
    'top',
    'good',
    'leading',
    'reputed',
    'famous',
    'here',
    'near',
    'me',
];
/** Single words to remove when they are standalone modifiers (after phrase removal) */
const STOP_WORDS = new Set([
    'near',
    'me',
    'popular',
    'best',
    'top',
    'good',
    'leading',
    'reputed',
    'famous',
    'nearby',
    'here',
    'the',
    'a',
    'an',
]);
/**
 * Normalize "X and Y" to "X&Y" so "s and s" matches academy name "S&S Football Academy".
 */
function normalizeAndToAmpersand(query) {
    if (!query || typeof query !== 'string')
        return query;
    return query.trim().replace(/\s+and\s+/gi, '&');
}
/**
 * Normalize search query by removing "near me", "popular", "best", etc.
 * So "popular cricket academy near me" → "cricket academy", "cricaket acaemy near me" → "cricaket acaemy".
 * Client should send latitude/longitude for "near me" to get distance-based results.
 */
function normalizeSearchQuery(query) {
    if (!query || typeof query !== 'string')
        return '';
    let q = query.trim().replace(/\s+/g, ' ');
    if (!q)
        return '';
    // "s and s" → "s&s", "s & s" → "s&s" so search matches "S&S Football Academy"
    q = q.replace(/\s+and\s+/gi, '&').replace(/\s*&\s*/g, '&');
    for (const phrase of STOP_PHRASES) {
        if (!phrase)
            continue;
        const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
        q = q.replace(regex, ' ');
    }
    q = q
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
        .join(' ');
    return q.trim() || query.trim();
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Levenshtein (edit) distance between two strings
 */
function levenshteinDistance(a, b) {
    const al = a.length;
    const bl = b.length;
    if (al === 0)
        return bl;
    if (bl === 0)
        return al;
    const row = Array.from({ length: bl + 1 }, (_, i) => i);
    for (let i = 1; i <= al; i++) {
        let prev = i;
        for (let j = 1; j <= bl; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            const next = Math.min(row[j - 1] + cost, row[j] + 1, prev + 1);
            row[j - 1] = prev;
            prev = next;
        }
        row[bl] = prev;
    }
    return row[bl];
}
/**
 * Max edit distance allowed for a word of given length (typo tolerance)
 */
function maxDistanceForLength(len) {
    if (len <= 3)
        return 1;
    if (len <= 6)
        return 2;
    return Math.min(3, Math.floor(len / 2));
}
/**
 * Corrects search query by matching words against a dictionary (e.g. sport names).
 * Words with length >= 3 that are close to a dictionary term are replaced.
 *
 * @param query - User's raw search query
 * @param dictionary - List of known terms (e.g. sport names). Will be lowercased for matching.
 * @returns Corrected query and whether any correction was applied
 */
function getCorrectedSearchQuery(query, dictionary) {
    const trimmed = query.trim();
    if (!trimmed || !dictionary.length) {
        return { corrected: trimmed, wasCorrected: false };
    }
    const terms = dictionary.map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) {
        return { corrected: trimmed, wasCorrected: false };
    }
    const words = trimmed.split(/\s+/);
    const corrections = [];
    let wasCorrected = false;
    const correctedWords = words.map((word) => {
        const lower = word.toLowerCase();
        if (lower.length < 3)
            return word;
        // Exact match (case-insensitive) – no change
        if (terms.includes(lower))
            return word;
        let bestMatch = null;
        let bestDistance = Infinity;
        const maxDist = maxDistanceForLength(lower.length);
        for (const term of terms) {
            const d = levenshteinDistance(lower, term);
            if (d <= maxDist && d < bestDistance) {
                bestDistance = d;
                bestMatch = term;
            }
        }
        if (bestMatch !== null) {
            wasCorrected = true;
            // Preserve original casing style: if user typed title-case, use dictionary term as-is (first letter upper)
            const displayCorrected = word[0] === word[0].toUpperCase()
                ? bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1)
                : bestMatch;
            corrections.push({ original: word, corrected: displayCorrected });
            return displayCorrected;
        }
        return word;
    });
    const corrected = correctedWords.join(' ');
    return {
        corrected,
        wasCorrected,
        corrections: corrections.length > 0 ? corrections : undefined,
    };
}
/** Minimum length for a word to be added to the dictionary (avoids noise) */
const MIN_WORD_LENGTH = 3;
/**
 * Extract unique words from text (split on non-letters), minimum length MIN_WORD_LENGTH
 */
function extractWords(text) {
    if (!text || typeof text !== 'string')
        return [];
    return text
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= MIN_WORD_LENGTH);
}
/**
 * Build a single dictionary array from sport names, coaching center names, cities, states, etc.
 * Used for auto-correct so queries can match "criket" -> "cricket", "acadmy" -> "academy", "mumba" -> "Mumbai".
 */
function buildSearchDictionary(sources) {
    const set = new Set();
    const add = (list) => {
        if (!list)
            return;
        list.forEach((s) => {
            const t = (s || '').trim();
            if (t.length >= MIN_WORD_LENGTH)
                set.add(t);
        });
    };
    const addWords = (list) => {
        if (!list)
            return;
        list.forEach((s) => extractWords(s || '').forEach((w) => set.add(w)));
    };
    add(sources.sportNames);
    add(sources.centerNames);
    add(sources.cities);
    add(sources.stateNames);
    addWords(sources.centerNames);
    if (sources.descriptionWords?.length)
        add(sources.descriptionWords);
    // Always include common search terms so "acaemy" -> "academy", "crickate" stays correctable by sport names
    ['academy', 'coaching', 'center', 'centre'].forEach((w) => set.add(w));
    return Array.from(set);
}
//# sourceMappingURL=searchCorrection.js.map