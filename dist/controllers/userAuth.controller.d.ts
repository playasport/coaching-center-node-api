import { Request, Response, NextFunction } from 'express';
export declare const registerUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const socialLoginUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateUserProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateUserAddress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const changeUserPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCurrentUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sendUserOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyUserOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Refresh access token using refresh token
 */
export declare const refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Logout user - blacklist current tokens
 */
export declare const logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Logout from all devices - blacklist all user tokens
 */
export declare const logoutAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateUserFavoriteSports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Save FCM token for push notifications (user)
 */
export declare const saveFcmToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * List all active devices/sessions for the current user
 */
export declare const getUserDevices: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Logout from a specific device by deviceToken id
 */
export declare const logoutDevice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get user's bookmarked academies
 */
export declare const getAcademyBookmarks: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Add academy to bookmarks. Returns updated list of bookmarked academies.
 */
export declare const addAcademyBookmark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Remove academy from bookmarks. Returns updated list of bookmarked academies.
 */
export declare const removeAcademyBookmark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userAuth.controller.d.ts.map