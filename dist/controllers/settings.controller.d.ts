import { Request, Response, NextFunction } from 'express';
/**
 * Get limited public settings (public route - only essential data)
 * Returns: app_name, app_logo, and contact info only
 */
export declare const getLimitedPublicSettings: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=settings.controller.d.ts.map