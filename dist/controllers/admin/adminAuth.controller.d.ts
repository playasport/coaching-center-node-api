import { Request, Response } from 'express';
/**
 * Admin login
 */
export declare const loginAdmin: (req: Request, res: Response) => Promise<void>;
/**
 * Get admin profile
 */
export declare const getAdminProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Update admin profile
 */
export declare const updateAdminProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Change admin password
 */
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
/**
 * Refresh admin access token
 */
export declare const refreshToken: (req: Request, res: Response) => Promise<void>;
/**
 * Logout admin - blacklist current tokens
 */
export declare const logout: (req: Request, res: Response) => Promise<void>;
/**
 * Logout admin from all devices - blacklist all user tokens
 */
export declare const logoutAll: (req: Request, res: Response) => Promise<void>;
/**
 * Update admin profile image
 */
export declare const updateAdminProfileImage: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminAuth.controller.d.ts.map