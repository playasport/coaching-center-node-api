import { Router } from 'express';
import {
  registerUser,
  socialLoginUser,
  sendUserOtp,
  verifyUserOtp,
  updateUserProfile,
  updateUserAddress,
  getCurrentUser,
  refreshToken,
  logout,
  logoutAll,
  updateUserFavoriteSports,
  saveFcmToken,
  getAcademyBookmarks,
  addAcademyBookmark,
  removeAcademyBookmark,
} from '../controllers/userAuth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  userRegisterSchema,
  userSocialLoginSchema,
  userOtpSchema,
  userVerifyOtpSchema,
  userProfileUpdateSchema,
  userAddressUpdateSchema,
  userFavoriteSportsUpdateSchema,
  saveFcmTokenSchema,
  addAcademyBookmarkSchema,
  academyIdParamSchema,
} from '../validations/auth.validation';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { generalRateLimit } from '../middleware/rateLimit.middleware';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { uploadProfileImage } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /user/auth/register:
 *   post:
 *     summary: Register a new user (student or guardian)
 *     description: |
 *       Register a new user with temporary token verification (issued after OTP verification).
 *       **New Registration Flow:**
 *       1. User sends OTP to mobile number via `/user/auth/send-otp` (mode='login')
 *       2. User verifies OTP via `/user/auth/verify-otp` (mode='login')
 *       3. If user doesn't exist, API returns `needsRegistration: true` and `tempToken` (valid for 30 minutes)
 *       4. User completes registration with `tempToken` (instead of OTP)
 *       
 *       **Security:** When using `tempToken`, the mobile number is extracted from the token itself (not from the request body) to prevent tampering.
 *       
 *       **Note:** Password is not required for user registration. Users authenticate via OTP only.
 *       
 *       **Device-Specific Refresh Tokens:**
 *       - When device info is provided, refresh tokens are device-specific
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device gets its own refresh token linked to the device
 *       - Access tokens are always 15 minutes regardless of device type
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
 *               - type
 *               - dob
 *               - gender
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
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *                 description: |
 *                   Mobile number (required only for legacy OTP flow).
 *                   **When using tempToken, mobile is NOT required** - it will be extracted from the tempToken for security.
 *               type:
 *                 type: string
 *                 enum: [student, guardian]
 *                 example: student
 *                 description: User type (student or guardian) - only applies when role is 'user'
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-15"
 *                 description: |
 *                   Date of birth in YYYY-MM-DD format.
 *                   **Age Requirements:**
 *                   - Minimum age for all users: 3 years
 *                   - Minimum age for students: 13 years
 *                   - Guardians: No maximum age limit
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               tempToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: |
 *                   Temporary registration token received from verify-otp endpoint (valid for 30 minutes).
 *                   **When using tempToken, OTP is NOT required** - the tempToken already verifies that OTP was validated.
 *                   Either tempToken or otp is required, but not both.
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: |
 *                   OTP code (legacy support only).
 *                   **Note:** If using the new registration flow with tempToken, do NOT provide OTP.
 *                   Either tempToken or otp is required, but not both.
 *               fcmToken:
 *                 type: string
 *                 description: FCM token for push notifications (optional)
 *               deviceType:
 *                 type: string
 *                 enum: [web, android, ios]
 *                 description: Device type for device-specific tokens (optional)
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier (optional)
 *               deviceName:
 *                 type: string
 *                 description: Device name (optional)
 *               appVersion:
 *                 type: string
 *                 description: App version (optional)
 *           examples:
 *             withTempToken:
 *               summary: New registration flow with tempToken (recommended)
 *               description: Mobile number is extracted from tempToken for security
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john@example.com"
 *                 type: "student"
 *                 dob: "2000-01-15"
 *                 gender: "male"
 *                 tempToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI5ODc2NTQzMjEwIiwidHlwZSI6InJlZ2lzdHJhdGlvbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAxODAwfQ.signature"
 *                 fcmToken: "fcm_token_here"
 *                 deviceType: "android"
 *                 deviceId: "device_unique_id"
 *                 deviceName: "Samsung Galaxy S21"
 *                 appVersion: "1.0.0"
 *             withTempTokenMinimal:
 *               summary: New registration flow - minimal fields
 *               description: Mobile number is extracted from tempToken for security
 *               value:
 *                 firstName: "John"
 *                 email: "john@example.com"
 *                 type: "student"
 *                 dob: "2000-01-15"
 *                 gender: "male"
 *                 tempToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI5ODc2NTQzMjEwIiwidHlwZSI6InJlZ2lzdHJhdGlvbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAxODAwfQ.signature"
 *             legacyWithOtp:
 *               summary: Legacy registration flow with OTP (not recommended)
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john@example.com"
 *                 mobile: "9876543210"
 *                 type: "guardian"
 *                 dob: "1985-05-20"
 *                 gender: "female"
 *                 otp: "123456"
 *     responses:
 *       201:
 *         description: User registered successfully. Returns access token (15 minutes) and device-specific refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *             examples:
 *               success:
 *                 summary: Registration successful
 *                 value:
 *                   success: true
 *                   message: "User registered successfully"
 *                   data:
 *                     user:
 *                       id: "user_id_123"
 *                       email: "john@example.com"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       mobile: "9876543210"
 *                       type: "student"
 *                       gender: "male"
 *                       dob: "2000-01-15"
 *                       isActive: true
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                     accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfaWRfMTIzIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDA5MDB9.signature"
 *                     refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfaWRfMTIzIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwNjA0ODAwfQ.signature"
 *       400:
 *         description: Validation error, invalid tempToken, or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidTempToken:
 *                 summary: Invalid or expired tempToken
 *                 value:
 *                   success: false
 *                   message: "Invalid or expired temporary registration token"
 *               mobileMismatch:
 *                 summary: Mobile number mismatch
 *                 value:
 *                   success: false
 *                   message: "Mobile number in token does not match the provided mobile number"
 *               emailExists:
 *                 summary: Email already exists
 *                 value:
 *                   success: false
 *                   message: "Coaching centre with this email already exists"
 *               validationError:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
 *               studentAgeError:
 *                 summary: Student age validation error
 *                 value:
 *                   success: false
 *                   message: "Student must be at least 13 years old"
 *               bothTokenAndOtp:
 *                 summary: Both tempToken and otp provided
 *                 value:
 *                   success: false
 *                   message: "Cannot provide both tempToken and otp. Use tempToken for new registration flow or otp for legacy flow."
 */
router.post('/register', validate(userRegisterSchema), registerUser);

/**
 * @swagger
 * /user/auth/social-login:
 *   post:
 *     summary: Login or register a user via social providers (Firebase)
 *     description: |
 *       Social login via Firebase (Google, Facebook, Instagram, Apple).
 *       **Device-Specific Refresh Tokens:**
 *       - When device info is provided, refresh tokens are device-specific
 *       - Web apps: Refresh tokens valid for 7 days
 *       - Mobile apps (Android/iOS): Refresh tokens valid for 90 days (configurable)
 *       - Each device gets its own refresh token linked to the device
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
 *               type:
 *                 type: string
 *                 enum: [student, guardian]
 *                 example: student
 *                 description: User type (student or guardian) - only applies when role is 'user'
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
router.post('/social-login', validate(userSocialLoginSchema), socialLoginUser);

/**
 * @swagger
 * /user/auth/send-otp:
 *   post:
 *     summary: Send OTP to a mobile number for login or registration
 *     description: |
 *       Sends OTP to the provided mobile number. 
 *       **For login mode:** Works for both existing and non-existing users. 
 *       If user doesn't exist, they will receive a temporary registration token after OTP verification.
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
 *                 description: |
 *                   - login: Works for both existing and non-existing users
 *                   - register: For explicit registration flow
 *                   - profile_update: For profile update verification
 *                   - forgot_password: For password reset
 *           examples:
 *             loginMode:
 *               summary: Login mode (works for existing and new users)
 *               value:
 *                 mobile: "9876543210"
 *                 mode: "login"
 *             registerMode:
 *               summary: Register mode
 *               value:
 *                 mobile: "9876543210"
 *                 mode: "register"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 *             examples:
 *               success:
 *                 summary: OTP sent successfully
 *                 value:
 *                   success: true
 *                   message: "One-time password has been generated and sent."
 *                   data:
 *                     mobile: "+919876543210"
 *                     mode: "login"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidMobile:
 *                 summary: Invalid mobile number
 *                 value:
 *                   success: false
 *                   message: "Mobile number must start with 6, 7, 8, or 9 and contain only digits"
 */
router.post('/send-otp', validate(userOtpSchema), sendUserOtp);

/**
 * @swagger
 * /user/auth/verify-otp:
 *   post:
 *     summary: Verify an OTP for login or registration
 *     description: |
 *       Verifies the OTP sent to the mobile number.
 *       **For login mode:**
 *       - If user exists: Returns user data with access and refresh tokens (login successful)
 *       - If user doesn't exist: Returns `needsRegistration: true` and `tempToken` (valid for 30 minutes) for registration
 *       
 *       **For other modes:** Returns verification success message
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
 *                 description: |
 *                   - login: Verifies OTP and logs in if user exists, or returns tempToken for registration if user doesn't exist
 *                   - register: Verifies OTP for registration flow
 *                   - profile_update: Verifies OTP for profile update
 *                   - forgot_password: Verifies OTP for password reset
 *               fcmToken:
 *                 type: string
 *                 description: FCM token for push notifications (optional)
 *               deviceType:
 *                 type: string
 *                 enum: [web, android, ios]
 *                 description: Device type for device-specific tokens (optional)
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier (optional)
 *               deviceName:
 *                 type: string
 *                 description: Device name (optional)
 *               appVersion:
 *                 type: string
 *                 description: App version (optional)
 *           examples:
 *             loginMode:
 *               summary: Login mode - basic
 *               value:
 *                 mobile: "9876543210"
 *                 otp: "123456"
 *                 mode: "login"
 *             loginModeWithDevice:
 *               summary: Login mode - with device info
 *               value:
 *                 mobile: "9876543210"
 *                 otp: "123456"
 *                 mode: "login"
 *                 fcmToken: "fcm_token_here"
 *                 deviceType: "android"
 *                 deviceId: "device_unique_id"
 *                 deviceName: "Samsung Galaxy S21"
 *                 appVersion: "1.0.0"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: User exists - login successful
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Login successful"
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                 - type: object
 *                   description: User doesn't exist - registration required
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "OTP verified. Please complete registration."
 *                     data:
 *                       type: object
 *                       properties:
 *                         needsRegistration:
 *                           type: boolean
 *                           example: true
 *                         tempToken:
 *                           type: string
 *                           description: Temporary registration token (valid for 30 minutes)
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 - type: object
 *                   description: Other modes - verification success
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "OTP verified successfully"
 *                     data:
 *                       type: object
 *                       nullable: true
 *             examples:
 *               userExists:
 *                 summary: User exists - login successful
 *                 value:
 *                   success: true
 *                   message: "Login successful"
 *                   data:
 *                     user:
 *                       id: "user_id_123"
 *                       email: "john@example.com"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       mobile: "9876543210"
 *                       type: "student"
 *                       isActive: true
 *                     accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfaWRfMTIzIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDA5MDB9.signature"
 *                     refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfaWRfMTIzIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwNjA0ODAwfQ.signature"
 *               userNotExists:
 *                 summary: User doesn't exist - registration required
 *                 value:
 *                   success: true
 *                   message: "OTP verified. Please complete registration."
 *                   data:
 *                     needsRegistration: true
 *                     tempToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI5ODc2NTQzMjEwIiwidHlwZSI6InJlZ2lzdHJhdGlvbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAxODAwfQ.signature"
 *               otherMode:
 *                 summary: Other modes - verification success
 *                 value:
 *                   success: true
 *                   message: "OTP verified successfully"
 *                   data: null
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidOtp:
 *                 summary: Invalid OTP
 *                 value:
 *                   success: false
 *                   message: "The OTP you entered is invalid."
 *               expiredOtp:
 *                 summary: Expired OTP
 *                 value:
 *                   success: false
 *                   message: "The OTP has expired. Please request a new one."
 *               usedOtp:
 *                 summary: OTP already used
 *                 value:
 *                   success: false
 *                   message: "The OTP has already been used."
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *                 description: Email address (must be unique)
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
  authorize(DefaultRoles.USER),
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
  authorize(DefaultRoles.USER),
  validate(userAddressUpdateSchema),
  updateUserAddress
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
 *         description: Current user details fetched successfully. User properties are spread directly in the data object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User details fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
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
  authorize(DefaultRoles.USER),
  getCurrentUser
);

/**
 * @swagger
 * /user/auth/favorite-sports:
 *   patch:
 *     summary: Update user's favorite sports
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               favoriteSports:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Sport ObjectIds
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: Favorite sports updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch(
  '/favorite-sports',
  authenticate,
  authorize(DefaultRoles.USER),
  validate(userFavoriteSportsUpdateSchema),
  updateUserFavoriteSports
);

/**
 * @swagger
 * /user/auth/academy-bookmarks:
 *   get:
 *     summary: Get user's bookmarked academies
 *     description: Returns all academies the authenticated user has bookmarked, with full academy details (AcademyListItem format). Ordered by most recently bookmarked first.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookmarked academies retrieved successfully (populated with academy details)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AcademyBookmarksResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Add academy to bookmarks
 *     description: |
 *       Adds an academy to the user's bookmarks. Only published, active, and approved academies can be bookmarked.
 *       Returns the **updated list of bookmarked academies** (populated) after the change.
 *       If the academy is already bookmarked, returns current list with `added: false`.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddAcademyBookmarkRequest'
 *     responses:
 *       200:
 *         description: Academy bookmarked. Returns updated list of bookmarked academies.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddAcademyBookmarkResponse'
 *       404:
 *         description: Academy not found
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
router.get(
  '/academy-bookmarks',
  authenticate,
  authorize(DefaultRoles.USER),
  getAcademyBookmarks
);
router.post(
  '/academy-bookmarks',
  authenticate,
  authorize(DefaultRoles.USER),
  validate(addAcademyBookmarkSchema),
  addAcademyBookmark
);

/**
 * @swagger
 * /user/auth/academy-bookmarks/{academyId}:
 *   delete:
 *     summary: Remove academy from bookmarks
 *     description: |
 *       Removes an academy from the user's bookmarks.
 *       Returns the **updated list of bookmarked academies** (populated) after the change.
 *       If the academy was not bookmarked, returns current list with `removed: false`.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: academyId
 *         required: true
 *         schema:
 *           type: string
 *           example: 'f316a86c-2909-4d32-8983-eb225c715bcb'
 *         description: Academy ID - CoachingCenter UUID or MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Academy removed from bookmarks. Returns updated list of bookmarked academies.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoveAcademyBookmarkResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/academy-bookmarks/:academyId',
  authenticate,
  authorize(DefaultRoles.USER),
  validate(academyIdParamSchema),
  removeAcademyBookmark
);

/**
 * @swagger
 * /user/auth/save-token:
 *   post:
 *     summary: Save FCM token for push notifications
 *     description: Register or update the device FCM token for the authenticated user. Used for push notifications.
 *     tags: [User Auth]
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
router.post(
  '/save-token',
  authenticate,
  authorize(DefaultRoles.USER),
  validate(saveFcmTokenSchema),
  saveFcmToken
);

/**
 * @swagger
 * /user/auth/refresh:
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
router.post('/logout', authenticate, authorize(DefaultRoles.USER), logout);

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
router.post('/logout-all', authenticate, authorize(DefaultRoles.USER), logoutAll);

export default router;

