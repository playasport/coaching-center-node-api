import { Request, Response, NextFunction } from 'express';
/**
 * Get paginated list of reels
 * GET /reels?page=1&limit=3
 */
export declare const getReelsList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get reels list with a specific reel first (by ID)
 * GET /reels/:id?page=1&limit=3
 */
export declare const getReelsListWithIdFirst: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update reel view count
 * PUT /reels/:id/view
 */
export declare const updateReelView: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=reel.controller.d.ts.map