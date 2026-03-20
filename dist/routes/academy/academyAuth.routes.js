"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const academyAuth_controller_1 = require("../../controllers/academy/academyAuth.controller");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const auth_validation_1 = require("../../validations/auth.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../../middleware/rateLimit.middleware");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const upload_middleware_1 = require("../../middleware/upload.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/auth/register:
 *   post:
 *     summary: Register a new academy user
 *     description: |
 *       Register a new academy user with OTP verification.
 *       **Device-Specific Refresh Tokens:**
 *       - When device info is provided, refresh tokens are device-specific
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device gets its own refresh token linked to the device
 *       - Access tokens are always 15 minutes regardless of device type
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyRegisterRequest'
 *     responses:
 *       201:
 *         description: Academy user registered successfully. Returns access token (15 minutes) and device-specific refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AcademyRegisterResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', (0, validation_middleware_1.validate)(auth_validation_1.academyRegisterSchema), academyAuth_controller_1.registerAcademyUser);
/**
 * @swagger
 * /academy/auth/login:
 *   post:
 *     summary: Login academy user with email and password
 *     description: |
 *       Login academy user and receive access/refresh tokens.
 *       **Device-Specific Refresh Tokens:**
 *       - When device info is provided, refresh tokens are device-specific
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device gets its own refresh token linked to the device
 *       - Access tokens are always 15 minutes regardless of device type
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful. Returns access token (15 minutes) and device-specific refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', rateLimit_middleware_1.loginRateLimit, (0, validation_middleware_1.validate)(auth_validation_1.academyLoginSchema), academyAuth_controller_1.loginAcademyUser);
/**
 * @swagger
 * /academy/auth/social-login:
 *   post:
 *     summary: Login or register an academy user via social providers (Firebase)
 *     description: |
 *       Social login via Firebase (Google, Facebook, Instagram, Apple).
 *       **Device-Specific Refresh Tokens:**
 *       - When device info is provided, refresh tokens are device-specific
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device gets its own refresh token linked to the device
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademySocialLoginRequest'
 *           example:
 *             provider: google
 *             idToken: eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...
 *             firstName: John
 *             lastName: Doe
 *             fcmToken: fcm-token-from-firebase-cloud-messaging
 *             deviceType: android
 *     responses:
 *       200:
 *         description: Social login successful. Returns access token (15 minutes) and device-specific refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *       400:
 *         description: Invalid token or missing user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/social-login', (0, validation_middleware_1.validate)(auth_validation_1.academySocialLoginSchema), academyAuth_controller_1.socialLoginAcademyUser);
/**
 * @swagger
 * /academy/auth/send-otp:
 *   post:
 *     summary: Send OTP to a mobile number for login or registration
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyOtpRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-otp', (0, validation_middleware_1.validate)(auth_validation_1.academyOtpSchema), academyAuth_controller_1.sendAcademyOtp);
/**
 * @swagger
 * /academy/auth/verify-otp:
 *   post:
 *     summary: Verify an OTP for login
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyVerifyOtpRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/UserTokenResponse'
 *                 - $ref: '#/components/schemas/OtpVerificationResponse'
 *           description: |
 *             Returns `UserTokenResponse` when verifying a login OTP,
 *             otherwise returns `OtpVerificationResponse`.
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify-otp', (0, validation_middleware_1.validate)(auth_validation_1.academyVerifyOtpSchema), academyAuth_controller_1.verifyAcademyOtp);
/**
 * @swagger
 * /academy/auth/profile:
 *   patch:
 *     summary: Update academy profile details
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or verification failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/profile', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), upload_middleware_1.uploadProfileImage, (0, validation_middleware_1.validate)(auth_validation_1.academyProfileUpdateSchema), academyAuth_controller_1.updateAcademyProfile);
/**
 * @swagger
 * /academy/auth/address:
 *   patch:
 *     summary: Update academy address
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyAddressUpdateRequest'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/address', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(auth_validation_1.academyAddressUpdateSchema), academyAuth_controller_1.updateAcademyAddress);
/**
 * @swagger
 * /academy/auth/password:
 *   patch:
 *     summary: Change academy user password
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyPasswordChangeRequest'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/password', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(auth_validation_1.academyPasswordChangeSchema), academyAuth_controller_1.changeAcademyPassword);
/**
 * @swagger
 * /academy/auth/me:
 *   get:
 *     summary: Get current academy user profile
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), academyAuth_controller_1.getCurrentAcademyUser);
/**
 * @swagger
 * /academy/auth/forgot-password/request:
 *   post:
 *     summary: Request password reset OTP via mobile or email
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/forgot-password/request', (0, validation_middleware_1.validate)(auth_validation_1.academyForgotPasswordRequestSchema), academyAuth_controller_1.requestAcademyPasswordReset);
/**
 * @swagger
 * /academy/auth/forgot-password/verify:
 *   post:
 *     summary: Verify password reset OTP and set new password
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyForgotPasswordVerify'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/forgot-password/verify', (0, validation_middleware_1.validate)(auth_validation_1.academyForgotPasswordVerifySchema), academyAuth_controller_1.verifyAcademyPasswordReset);
/**
 * @swagger
 * /academy/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     description: |
 *       Refreshes the access token using a valid refresh token.
 *       **Device-Specific Tokens:**
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device has its own refresh token linked to the device
 *       - Old refresh token is blacklisted and new one is issued (token rotation)
 *       - Device must be active for refresh to succeed
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 description: Refresh token received during login/register. Device-specific tokens are validated against device records.
 *     responses:
 *       200:
 *         description: Token refreshed successfully. New tokens issued with same device type and expiry.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Invalid or expired refresh token, or device is inactive
 */
router.post('/refresh', rateLimit_middleware_1.generalRateLimit, academyAuth_controller_1.refreshToken);
/**
 * @swagger
 * /academy/auth/save-token:
 *   post:
 *     summary: Save FCM token for push notifications
 *     description: Register or update the device FCM token for the authenticated academy user. Used for push notifications.
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaveFcmTokenRequest'
 *     responses:
 *       200:
 *         description: FCM token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SaveFcmTokenResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/save-token', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(auth_validation_1.saveFcmTokenSchema), academyAuth_controller_1.saveFcmToken);
/**
 * @swagger
 * /academy/auth/logout:
 *   post:
 *     summary: Logout user (blacklist current tokens)
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token to blacklist
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), academyAuth_controller_1.logout);
/**
 * @swagger
 * /academy/auth/logout-all:
 *   post:
 *     summary: Logout from all devices (blacklist all user tokens)
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/logout-all', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), academyAuth_controller_1.logoutAll);
/**
 * @swagger
 * /academy/auth/account:
 *   delete:
 *     summary: Soft-delete your academy account
 *     description: |
 *       Sets a per-role soft delete for the `academy` role, deactivates owned coaching centers and batches,
 *       and revokes academy app sessions. If the same account also has a user role, user-app login may still work.
 *       Idempotent — repeated calls return success with `alreadyDeleted: true`.
 *     tags: [Academy Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academy role soft-deleted (or already deleted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (e.g. no academy role)
 */
router.delete('/account', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), academyAuth_controller_1.deleteMyAcademyAccount);
exports.default = router;
//# sourceMappingURL=academyAuth.routes.js.map