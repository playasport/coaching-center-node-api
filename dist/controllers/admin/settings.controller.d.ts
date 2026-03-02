import { Request, Response, NextFunction } from 'express';
/**
 * Get all settings (admin only - includes sensitive data)
 */
export declare const getSettings: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update settings (admin only)
 */
export declare const updateSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update basic information
 */
export declare const updateBasicInfo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update fee configuration
 */
export declare const updateFeeConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update notification configuration
 */
export declare const updateNotificationConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update payment configuration
 */
export declare const updatePaymentConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Toggle payment gateway enable/disable
 */
export declare const togglePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload app logo
 */
export declare const uploadLogo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reset settings to default
 */
export declare const resetSettings: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=settings.controller.d.ts.map