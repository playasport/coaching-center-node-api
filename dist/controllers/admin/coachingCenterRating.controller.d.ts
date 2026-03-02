import { Request, Response, NextFunction } from 'express';
/**
 * Get paginated list of coaching center ratings (admin).
 */
export declare const getRatings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get a single rating by id (admin).
 */
export declare const getRatingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update rating status (approve / reject / pending).
 */
export declare const updateRatingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=coachingCenterRating.controller.d.ts.map