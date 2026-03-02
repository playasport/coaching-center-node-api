import { Request, Response, NextFunction } from 'express';
/**
 * Get all CMS pages for admin
 */
export declare const getAllCmsPages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get CMS page by ID for admin
 */
export declare const getCmsPageById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create new CMS page
 */
export declare const createCmsPage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update CMS page
 */
export declare const updateCmsPage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete CMS page
 */
export declare const deleteCmsPage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=cmsPage.controller.d.ts.map