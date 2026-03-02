import { Request, Response, NextFunction } from 'express';
/**
 * Get home page data (nearby academies and popular sports)
 * GET /home
 * Query params: latitude, longitude (optional) - location coordinates
 */
export declare const getHomeData: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=home.controller.d.ts.map