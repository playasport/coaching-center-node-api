import { Request, Response, NextFunction } from 'express';
export declare const createCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const toggleCoachingCenterStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteCoachingCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMyCoachingCenters: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Remove media from coaching center (soft delete)
 */
export declare const removeMedia: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=coachingCenter.controller.d.ts.map