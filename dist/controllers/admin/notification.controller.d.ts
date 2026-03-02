import { Request, Response, NextFunction } from 'express';
/**
 * Send notification from admin panel
 */
export declare const sendNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Test notification (sends a test notification)
 */
export declare const testNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all notifications for admin
 */
export declare const getAllNotifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get admin's own notifications (by roles)
 */
export declare const getMyNotifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get unread count for admin (by roles)
 */
export declare const getUnreadCount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Mark notification as read (admin - by roles)
 */
export declare const markAsRead: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=notification.controller.d.ts.map