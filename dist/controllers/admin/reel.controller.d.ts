import { Request, Response, NextFunction } from 'express';
/**
 * Get all reels for admin
 */
export declare const getAllReels: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get reel by ID for admin
 */
export declare const getReelById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload video for reel
 * Validates video duration (max 90 seconds) during upload
 */
export declare const uploadReelVideo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload thumbnail for reel
 */
export declare const uploadReelThumbnail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload both video and thumbnail
 * Validates video duration (max 90 seconds) during upload
 */
export declare const uploadReelMedia: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create reel by admin
 */
export declare const createReel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update reel by admin
 */
export declare const updateReel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete reel (soft delete)
 */
export declare const deleteReel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update reel status
 */
export declare const updateReelStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reprocess video for a reel
 */
export declare const reprocessReelVideo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload preview video for a specific reel
 */
export declare const uploadReelPreview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=reel.controller.d.ts.map