import { Request, Response, NextFunction } from 'express';
/**
 * Get notifications for academy
 */
export declare const getNotifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get unread count for academy
 */
export declare const getUnreadCount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Mark notification as read
 */
export declare const markAsRead: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Mark notification as unread
 */
export declare const markAsUnread: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Mark all notifications as read
 */
export declare const markAllAsRead: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete notification
 */
export declare const deleteNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=notification.controller.d.ts.map