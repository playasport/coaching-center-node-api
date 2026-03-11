import type { AcademyRegisterInput, AcademyLoginInput, AcademySocialLoginInput, AcademyProfileUpdateInput, AcademyAddressUpdateInput, AcademyPasswordChangeInput, AcademyForgotPasswordRequestInput, AcademyForgotPasswordVerifyInput, UserRegisterInput, UserLoginInput, UserSocialLoginInput, UserProfileUpdateInput, UserAddressUpdateInput, UserPasswordChangeInput, UserForgotPasswordRequestInput, UserForgotPasswordVerifyInput } from '../../validations/auth.validation';
import { User } from '../../models/user.model';
export interface RegisterResult {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export interface LoginResult {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export interface SocialLoginResult {
    user: User;
    accessToken: string;
    refreshToken: string;
    provider?: string;
}
export interface RefreshTokenResult {
    accessToken: string;
    refreshToken: string;
}
export interface PasswordResetResult {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export interface OtpSendResult {
    mobile: string;
    mode: string;
}
export interface OtpVerifyResult {
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    needsRegistration?: boolean;
    tempToken?: string;
}
/**
 * Register a new academy user
 */
export declare const registerAcademyUser: (data: AcademyRegisterInput) => Promise<RegisterResult>;
/**
 * Login academy user with email and password
 */
export declare const loginAcademyUser: (data: AcademyLoginInput) => Promise<LoginResult>;
/**
 * Social login for academy user
 */
export declare const socialLoginAcademyUser: (data: AcademySocialLoginInput) => Promise<SocialLoginResult>;
/**
 * Update academy user profile
 */
export declare const updateAcademyProfile: (userId: string, data: AcademyProfileUpdateInput, file?: Express.Multer.File) => Promise<User>;
/**
 * Update academy user address
 */
export declare const updateAcademyAddress: (userId: string, data: AcademyAddressUpdateInput) => Promise<User>;
/**
 * Change academy user password
 */
export declare const changeAcademyPassword: (userId: string, data: AcademyPasswordChangeInput) => Promise<void>;
/**
 * Request password reset OTP
 */
export declare const requestAcademyPasswordReset: (data: AcademyForgotPasswordRequestInput) => Promise<{
    mode: string;
}>;
/**
 * Verify password reset OTP and reset password
 */
export declare const verifyAcademyPasswordReset: (data: AcademyForgotPasswordVerifyInput) => Promise<PasswordResetResult>;
/**
 * Get current academy user
 */
export declare const getCurrentAcademyUser: (userId: string) => Promise<User>;
/**
 * Send OTP to mobile number
 */
export declare const sendAcademyOtp: (data: {
    mobile: string;
    mode?: "login" | "register" | "profile_update" | "forgot_password";
}) => Promise<OtpSendResult>;
/**
 * Verify OTP
 */
export declare const verifyAcademyOtp: (data: {
    mobile: string;
    otp: string;
    mode?: "login" | "register" | "profile_update" | "forgot_password";
    agentCode?: string | null;
    fcmToken?: string;
    deviceType?: "web" | "android" | "ios";
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
}) => Promise<OtpVerifyResult>;
/**
 * Refresh access token using refresh token
 */
export declare const refreshToken: (token: string) => Promise<RefreshTokenResult>;
/**
 * Logout user - blacklist current tokens
 */
export declare const logout: (userId: string, accessToken?: string, refreshToken?: string) => Promise<void>;
/**
 * Logout from all devices - blacklist all user tokens and revoke all device refresh tokens
 */
export declare const logoutAll: (userId: string) => Promise<void>;
/**
 * Logout from a specific device by deviceToken id.
 * Blacklists the device's refresh token and deactivates the device record.
 */
export declare const logoutDevice: (userId: string, deviceTokenId: string) => Promise<boolean>;
/**
 * Register a new user (student or guardian)
 */
export declare const registerUser: (data: UserRegisterInput) => Promise<RegisterResult>;
/**
 * Login user with email and password
 */
export declare const loginUser: (data: UserLoginInput) => Promise<LoginResult>;
/**
 * Social login for user
 */
export declare const socialLoginUser: (data: UserSocialLoginInput) => Promise<SocialLoginResult>;
/**
 * Update user profile
 */
export declare const updateUserProfile: (userId: string, data: UserProfileUpdateInput, file?: Express.Multer.File) => Promise<User>;
/**
 * Update user address
 */
export declare const updateUserAddress: (userId: string, data: UserAddressUpdateInput) => Promise<User>;
/**
 * Change user password
 */
export declare const changeUserPassword: (userId: string, data: UserPasswordChangeInput) => Promise<void>;
/**
 * Request password reset OTP for user
 */
export declare const requestUserPasswordReset: (data: UserForgotPasswordRequestInput) => Promise<{
    mode: string;
}>;
/**
 * Verify password reset OTP and reset password for user
 */
export declare const verifyUserPasswordReset: (data: UserForgotPasswordVerifyInput) => Promise<PasswordResetResult>;
/**
 * Get current user
 * Optimized: Excludes roles, isDeleted, updatedAt and populates favoriteSports
 */
export declare const getCurrentUser: (userId: string) => Promise<any>;
/**
 * Send OTP to mobile number for user
 */
export declare const sendUserOtp: (data: {
    mobile: string;
    mode?: "login" | "register" | "profile_update" | "forgot_password";
}) => Promise<OtpSendResult>;
/**
 * Verify OTP for user
 */
export declare const verifyUserOtp: (data: {
    mobile: string;
    otp: string;
    mode?: "login" | "register" | "profile_update" | "forgot_password";
    fcmToken?: string;
    deviceType?: "web" | "android" | "ios";
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
}) => Promise<OtpVerifyResult>;
//# sourceMappingURL=auth.service.d.ts.map