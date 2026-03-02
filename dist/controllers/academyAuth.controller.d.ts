import { Request, Response, NextFunction } from 'express';
export declare const registerAcademyUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const loginAcademyUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const socialLoginAcademyUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAcademyProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAcademyAddress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const changeAcademyPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requestAcademyPasswordReset: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyAcademyPasswordReset: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCurrentAcademyUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sendAcademyOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyAcademyOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
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
//# sourceMappingURL=academyAuth.controller.d.ts.map