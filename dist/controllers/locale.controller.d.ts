import { Request, Response, NextFunction } from 'express';
/**
 * Get current locale
 */
export declare const getCurrentLocale: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Set locale for the current request
 */
export declare const setCurrentLocale: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=locale.controller.d.ts.map