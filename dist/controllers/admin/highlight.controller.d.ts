import { Request, Response, NextFunction } from 'express';
/**
 * Get all highlights for admin
 */
export declare const getAllHighlights: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get highlight by ID for admin
 */
export declare const getHighlightById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create new highlight
 */
export declare const createHighlight: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload video for highlight
 */
export declare const uploadHighlightVideo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload thumbnail for highlight
 */
export declare const uploadHighlightThumbnail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload both video and thumbnail
 */
export declare const uploadHighlightMedia: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload preview video for a specific highlight
 */
export declare const uploadHighlightPreview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update highlight by admin
 */
export declare const updateHighlight: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete highlight (soft delete)
 */
export declare const deleteHighlight: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update highlight status
 */
export declare const updateHighlightStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reprocess video for a highlight
 */
export declare const reprocessHighlightVideo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=highlight.controller.d.ts.map