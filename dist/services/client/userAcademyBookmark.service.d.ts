import type { AcademyListItem } from './academy.service';
/**
 * Fetch bookmarked academies for a user and return as AcademyListItem[]
 */
export declare function getBookmarkedAcademies(userId: string): Promise<AcademyListItem[]>;
/**
 * Add academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export declare function addBookmark(userId: string, academyId: string): Promise<{
    bookmarks: AcademyListItem[];
    added: boolean;
}>;
/**
 * Remove academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export declare function removeBookmark(userId: string, academyId: string): Promise<{
    bookmarks: AcademyListItem[];
    removed: boolean;
}>;
/**
 * Toggle academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export declare function toggleBookmark(userId: string, academyId: string): Promise<{
    bookmarks: AcademyListItem[];
    isBookmarked: boolean;
}>;
//# sourceMappingURL=userAcademyBookmark.service.d.ts.map