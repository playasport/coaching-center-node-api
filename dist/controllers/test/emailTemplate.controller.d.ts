import { Request, Response, NextFunction } from 'express';
/**
 * Get list of all available email templates
 */
export declare const getEmailTemplatesList: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Preview a specific email template
 */
export declare const previewEmailTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=emailTemplate.controller.d.ts.map