import { Request, Response, NextFunction } from 'express';
/**
 * Get paginated list of highlights
 * GET /highlights?page=1&limit=10
 */
export declare const getHighlightsList: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get highlight details by ID
 * GET /highlights/:id
 */
export declare const getHighlightById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update highlight view count
 * PUT /highlights/:id/view
 */
export declare const updateHighlightView: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=highlight.controller.d.ts.map