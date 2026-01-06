import { Router } from 'express';
import * as adminAuthController from '../../controllers/admin/adminAuth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { validate } from '../../middleware/validation.middleware';
import { generalRateLimit } from '../../middleware/rateLimit.middleware';
import { uploadImage } from '../../middleware/upload.middleware';
import {
  adminLoginSchema,
  adminUpdateProfileSchema,
  adminChangePasswordSchema,
  adminRefreshTokenSchema,
} from '../../validations/adminAuth.validation';

const router = Router();

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate admin user (Super Admin, Admin, Employee, or Agent) and receive access/refresh tokens
 *     tags: [Admin Auth]
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
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminLoginResponse'
 *             example:
 *               success: true
 *               message: "Login successful"
 *               data:
 *                 user:
 *                   id: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *                   email: "admin@playasport.in"
 *                   firstName: "Super"
 *                   lastName: "Admin"
 *                   profileImage: "https://bucket.s3.region.amazonaws.com/users/user-id-image.jpg"
 *                   roles: ["super_admin"]
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Invalid credentials"
 *       403:
 *         description: User does not have admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden"
 */
router.post('/login', validate(adminLoginSchema), adminAuthController.loginAdmin);

/**
 * @swagger
 * /admin/auth/profile:
 *   get:
 *     summary: Get admin profile
 *     description: Retrieve the authenticated admin user's profile information
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminProfileResponse'
 *             example:
 *               success: true
 *               message: "Profile retrieved successfully"
 *               data:
 *                 user:
 *                   id: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *                   firstName: "Super"
 *                   lastName: "Admin"
 *                   email: "admin@playasport.in"
 *                   mobile: "9876543210"
 *                   roles:
 *                     - name: "super_admin"
 *                       description: "Super Administrator with full system access"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.get('/profile', authenticate, requireAdmin, adminAuthController.getAdminProfile);

/**
 * @swagger
 * /admin/auth/profile:
 *   patch:
 *     summary: Update admin profile
 *     description: Update the authenticated admin user's profile information
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateProfileRequest'
 *           example:
 *             firstName: "Super"
 *             lastName: "Admin"
 *             mobile: "9876543210"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminProfileResponse'
 *             example:
 *               success: true
 *               message: "Profile updated successfully"
 *               data:
 *                 user:
 *                   id: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *                   firstName: "Super"
 *                   lastName: "Admin"
 *                   email: "admin@playasport.in"
 *                   mobile: "9876543210"
 *                   roles:
 *                     - name: "super_admin"
 *                   isActive: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.patch(
  '/profile',
  authenticate,
  requireAdmin,
  validate(adminUpdateProfileSchema),
  adminAuthController.updateAdminProfile
);

/**
 * @swagger
 * /admin/auth/profile/image:
 *   patch:
 *     summary: Update admin profile image
 *     description: Update the authenticated admin user's profile image. Accepts image as binary file in multipart/form-data with field name 'image'
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP). Max size as configured in maxProfileImageSize
 *     responses:
 *       200:
 *         description: Profile image updated successfully
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
 *                   example: "Profile image updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *                         email:
 *                           type: string
 *                           example: "admin@playasport.in"
 *                         firstName:
 *                           type: string
 *                           example: "Super"
 *                         lastName:
 *                           type: string
 *                           example: "Admin"
 *                         profileImage:
 *                           type: string
 *                           format: uri
 *                           example: "https://bucket.s3.region.amazonaws.com/users/user-id-image.jpg"
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["super_admin"]
 *       400:
 *         description: Image file is required or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Image file is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.patch(
  '/profile/image',
  authenticate,
  requireAdmin,
  uploadImage,
  adminAuthController.updateAdminProfileImage
);

/**
 * @swagger
 * /admin/auth/password:
 *   patch:
 *     summary: Change admin password
 *     description: Change the authenticated admin user's password
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminChangePasswordRequest'
 *           example:
 *             currentPassword: "Admin@123"
 *             newPassword: "NewAdmin@123456"
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: "Password changed successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Password changed successfully"
 *               data: null
 *       400:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Current password is incorrect"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.patch(
  '/password',
  authenticate,
  requireAdmin,
  validate(adminChangePasswordSchema),
  adminAuthController.changePassword
);

/**
 * @swagger
 * /admin/auth/refresh:
 *   post:
 *     summary: Refresh admin access token
 *     description: Refresh the access token using a valid refresh token. Returns new access and refresh tokens.
 *     tags: [Admin Auth]
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
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: Refresh token received during login
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *             example:
 *               success: true
 *               message: "Token refreshed successfully"
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Refresh token is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Refresh token is required"
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Invalid or expired refresh token"
 *       403:
 *         description: User does not have admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden"
 */
router.post(
  '/refresh',
  generalRateLimit,
  validate(adminRefreshTokenSchema),
  adminAuthController.refreshToken
);

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: Logout admin (blacklist current tokens)
 *     description: Logout the authenticated admin user and blacklist the current access and refresh tokens
 *     tags: [Admin Auth]
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
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: null
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.post('/logout', authenticate, requireAdmin, adminAuthController.logout);

/**
 * @swagger
 * /admin/auth/logout-all:
 *   post:
 *     summary: Logout admin from all devices
 *     description: Logout the authenticated admin user from all devices and blacklist all tokens
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *             example:
 *               success: true
 *               message: "Logged out from all devices successfully"
 *               data: null
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.post('/logout-all', authenticate, requireAdmin, adminAuthController.logoutAll);

export default router;
