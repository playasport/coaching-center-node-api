import { Router } from 'express';
import {
  registerUser,
  loginUser,
  socialLoginUser,
  sendUserOtp,
  verifyUserOtp,
  updateUserProfile,
  updateUserAddress,
  changeUserPassword,
  getCurrentUser,
  requestUserPasswordReset,
  verifyUserPasswordReset,
  refreshToken,
  logout,
  logoutAll,
} from '../controllers/userAuth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  userRegisterSchema,
  userLoginSchema,
  userSocialLoginSchema,
  userOtpSchema,
  userVerifyOtpSchema,
  userProfileUpdateSchema,
  userAddressUpdateSchema,
  userPasswordChangeSchema,
  userForgotPasswordRequestSchema,
  userForgotPasswordVerifySchema,
} from '../validations/auth.validation';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { loginRateLimit, generalRateLimit } from '../middleware/rateLimit.middleware';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { uploadProfileImage } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /user/auth/register:
 *   post:
 *     summary: Register a new user (student or guardian)
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - email
 *               - password
 *               - mobile
 *               - role
 *               - dob
 *               - gender
 *               - otp
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password@123
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               role:
 *                 type: string
 *                 enum: [student, guardian]
 *                 example: student
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-15"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validate(userRegisterSchema), registerUser);

/**
 * @swagger
 * /user/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password@123
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
router.post('/login', loginRateLimit, validate(userLoginSchema), loginUser);

/**
 * @swagger
 * /user/auth/social-login:
 *   post:
 *     summary: Login or register a user via social providers (Firebase)
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, facebook, instagram, apple]
 *                 example: google
 *               idToken:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               role:
 *                 type: string
 *                 enum: [student, guardian]
 *                 example: student
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
router.post('/social-login', validate(userSocialLoginSchema), socialLoginUser);

/**
 * @swagger
 * /user/auth/send-otp:
 *   post:
 *     summary: Send OTP to a mobile number for login or registration
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               mode:
 *                 type: string
 *                 enum: [login, register, profile_update, forgot_password]
 *                 default: login
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
router.post('/send-otp', validate(userOtpSchema), sendUserOtp);

/**
 * @swagger
 * /user/auth/verify-otp:
 *   post:
 *     summary: Verify an OTP for login or registration
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *               - otp
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               mode:
 *                 type: string
 *                 enum: [login, register, profile_update, forgot_password]
 *                 default: login
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
router.post('/verify-otp', validate(userVerifyOtpSchema), verifyUserOtp);

/**
 * @swagger
 * /user/auth/profile:
 *   patch:
 *     summary: Update user profile details
 *     tags: [User Auth]
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
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-15"
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
  authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN),
  uploadProfileImage,
  validate(userProfileUpdateSchema),
  updateUserProfile
);

/**
 * @swagger
 * /user/auth/address:
 *   patch:
 *     summary: Update user address
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAddressUpdateRequest'
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
  authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN),
  validate(userAddressUpdateSchema),
  updateUserAddress
);

/**
 * @swagger
 * /user/auth/password:
 *   patch:
 *     summary: Change user password
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
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
  authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN),
  validate(userPasswordChangeSchema),
  changeUserPassword
);

/**
 * @swagger
 * /user/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User Auth]
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
  authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN),
  getCurrentUser
);

/**
 * @swagger
 * /user/auth/forgot-password/request:
 *   post:
 *     summary: Request password reset OTP via mobile or email
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - mode
 *                   - mobile
 *                 properties:
 *                   mode:
 *                     type: string
 *                     enum: [mobile]
 *                   mobile:
 *                     type: string
 *                     example: "9876543210"
 *               - type: object
 *                 required:
 *                   - mode
 *                   - email
 *                 properties:
 *                   mode:
 *                     type: string
 *                     enum: [email]
 *                   email:
 *                     type: string
 *                     format: email
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
  validate(userForgotPasswordRequestSchema),
  requestUserPasswordReset
);

/**
 * @swagger
 * /user/auth/forgot-password/verify:
 *   post:
 *     summary: Verify password reset OTP and set new password
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - mode
 *                   - mobile
 *                   - otp
 *                   - newPassword
 *                 properties:
 *                   mode:
 *                     type: string
 *                     enum: [mobile]
 *                   mobile:
 *                     type: string
 *                   otp:
 *                     type: string
 *                   newPassword:
 *                     type: string
 *                     format: password
 *               - type: object
 *                 required:
 *                   - mode
 *                   - email
 *                   - otp
 *                   - newPassword
 *                 properties:
 *                   mode:
 *                     type: string
 *                     enum: [email]
 *                   email:
 *                     type: string
 *                     format: email
 *                   otp:
 *                     type: string
 *                   newPassword:
 *                     type: string
 *                     format: password
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
  validate(userForgotPasswordVerifySchema),
  verifyUserPasswordReset
);

/**
 * @swagger
 * /user/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [User Auth]
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
 * /user/auth/logout:
 *   post:
 *     summary: Logout user (blacklist current tokens)
 *     tags: [User Auth]
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
router.post('/logout', authenticate, authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN), logout);

/**
 * @swagger
 * /user/auth/logout-all:
 *   post:
 *     summary: Logout from all devices (blacklist all user tokens)
 *     tags: [User Auth]
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
router.post('/logout-all', authenticate, authorize(DefaultRoles.STUDENT, DefaultRoles.GUARDIAN), logoutAll);

export default router;

