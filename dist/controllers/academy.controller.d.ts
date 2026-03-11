import { Request, Response, NextFunction } from 'express';
/**
 * Get all academies with pagination
 * Supports location-based sorting and favorite sports preference
 */
export declare const getAllAcademies: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get academy details by ID
 * Supports: MongoDB ObjectId, CoachingCenter UUID, or User custom ID
 * When latitude & longitude provided, returns distance in km
 */
export declare const getAcademyById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get academies by city name
 */
export declare const getAcademiesByCity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get academies by sport slug
 */
export declare const getAcademiesBySport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Submit or update rating for a coaching center (one per user, can update).
 */
export declare const submitRating: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get paginated ratings for a coaching center.
 */
export declare const getRatingsByAcademyId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=academy.controller.d.ts.map