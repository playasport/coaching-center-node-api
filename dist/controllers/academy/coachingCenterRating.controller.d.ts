import { Request, Response, NextFunction } from 'express';
/**
 * Get paginated list of ratings for the academy's coaching centers.
 */
export declare const getRatings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get a single rating by id (only if it belongs to the academy's centers).
 */
export declare const getRatingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update rating status (approve / reject / pending) for a rating belonging to the academy's centers.
 */
export declare const updateRatingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=coachingCenterRating.controller.d.ts.map