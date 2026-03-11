import { Request, Response } from 'express';
/**
 * Autocomplete API
 * GET /api/v1/search/autocomplete?q=searchterm&size=5&latitude=28.6139&longitude=77.2090&radius=50
 */
export declare const autocomplete: (req: Request, res: Response) => Promise<void>;
/**
 * Full Search API
 * GET /api/v1/search?q=searchterm&size=10&from=0&index=coaching_centres_index&latitude=28.6139&longitude=77.2090&radius=50
 */
export declare const search: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=search.controller.d.ts.map