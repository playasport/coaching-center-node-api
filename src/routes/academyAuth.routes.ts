import { Router } from 'express';
import {
  registerAcademyUser,
  loginAcademyUser,
  socialLoginAcademyUser,
  sendAcademyOtp,
  verifyAcademyOtp,
  updateAcademyProfile,
  updateAcademyAddress,
  changeAcademyPassword,
  getCurrentAcademyUser,
  requestAcademyPasswordReset,
  verifyAcademyPasswordReset,
  refreshToken,
  logout,
  logoutAll,
} from '../controllers/academyAuth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  academyRegisterSchema,
  academyLoginSchema,
  academySocialLoginSchema,
  academyOtpSchema,
  academyVerifyOtpSchema,
  academyProfileUpdateSchema,
  academyAddressUpdateSchema,
  academyPasswordChangeSchema,
  academyForgotPasswordRequestSchema,
  academyForgotPasswordVerifySchema,
} from '../validations/auth.validation';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { loginRateLimit, generalRateLimit } from '../middleware/rateLimit.middleware';
import { DefaultRoles } from '../models/role.model';
import { uploadProfileImage } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /academy/auth/register:
 *   post:
 *     summary: Register a new academy user
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyRegisterRequest'
 *     responses:
 *       201:
 *         description: Academy user registered successfully
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
router.post('/register', validate(academyRegisterSchema), registerAcademyUser);

/**
 * @swagger
 * /academy/auth/login:
 *   post:
 *     summary: Login academy user with email and password
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
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
router.post('/login', loginRateLimit, validate(academyLoginSchema), loginAcademyUser);

/**
 * @swagger
 * /academy/auth/social-login:
 *   post:
 *     summary: Login or register an academy user via social providers (Firebase)
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
 *     responses:
 *       200:
 *         description: Social login successful
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
router.post('/social-login', validate(academySocialLoginSchema), socialLoginAcademyUser);

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
router.post('/send-otp', validate(academyOtpSchema), sendAcademyOtp);

/**
 * @swagger
 * /academy/auth/verify-otp:
 *   post:
 *     summary: Verify an OTP for login or registration
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
router.post('/verify-otp', validate(academyVerifyOtpSchema), verifyAcademyOtp);

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
router.patch(
  '/profile',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  uploadProfileImage,
  validate(academyProfileUpdateSchema),
  updateAcademyProfile
);

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
router.patch(
  '/address',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyAddressUpdateSchema),
  updateAcademyAddress
);

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
router.patch(
  '/password',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyPasswordChangeSchema),
  changeAcademyPassword
);

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
router.get(
  '/me',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  getCurrentAcademyUser
);

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
router.post(
  '/forgot-password/request',
  validate(academyForgotPasswordRequestSchema),
  requestAcademyPasswordReset
);

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
router.post(
  '/forgot-password/verify',
  validate(academyForgotPasswordVerifySchema),
  verifyAcademyPasswordReset
);

/**
 * @swagger
 * /academy/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
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
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', generalRateLimit, refreshToken);

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
router.post('/logout', authenticate, authorize(DefaultRoles.ACADEMY), logout);

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
router.post('/logout-all', authenticate, authorize(DefaultRoles.ACADEMY), logoutAll);

export default router;


