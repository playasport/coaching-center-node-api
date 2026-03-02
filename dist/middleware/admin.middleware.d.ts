import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to require admin role
 * Ensures user is authenticated and has an admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=admin.middleware.d.ts.map