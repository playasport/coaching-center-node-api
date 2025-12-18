import { Router } from 'express';
import * as userController from '../../controllers/admin/user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import { validate } from '../../middleware/validation.middleware';
import { createAdminUserSchema, updateAdminUserSchema } from '../../validations/adminUser.validation';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create user (admin)
 *     description: Create a new user with specified roles and password. Requires user:create permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminUserRequest'
 *           example:
 *             email: "newuser@example.com"
 *             password: "SecurePass@123"
 *             firstName: "John"
 *             lastName: "Doe"
 *             mobile: "9876543210"
 *             gender: "male"
 *             dob: "1990-01-01T00:00:00.000Z"
 *             roles: ["user"]
 *             userType: "student"
 *             isActive: true
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: "User created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User created successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "newuser@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   dob: "1990-01-01T00:00:00.000Z"
 *                   roles:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Email already exists"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 */
router.post(
  '/',
  requirePermission(Section.USER, Action.CREATE),
  validate(createAdminUserSchema),
  userController.createUser
);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     description: Retrieve paginated list of all users with role information. Requires user:view permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *             example:
 *               success: true
 *               message: "Users retrieved successfully"
 *               data:
 *                 users:
 *                   - id: "550e8400-e29b-41d4-a716-446655440000"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     email: "john@example.com"
 *                     mobile: "9876543210"
 *                     gender: "male"
 *                     roles:
 *                       - id: "507f1f77bcf86cd799439011"
 *                         name: "user"
 *                         description: "Regular user"
 *                     userType: "student"
 *                     isActive: true
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1000
 *                   totalPages: 100
 *                   hasNextPage: true
 *                   hasPrevPage: false
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 */
router.get('/', requirePermission(Section.USER, Action.VIEW), userController.getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID (admin)
 *     description: Retrieve a specific user by ID. Requires user:view permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User retrieved successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "john@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   dob: "1990-01-01T00:00:00.000Z"
 *                   roles:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
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
router.get('/:id', requirePermission(Section.USER, Action.VIEW), userController.getUser);

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Update user (admin)
 *     description: Update a user. Requires user:update permission. All fields are optional. Roles can be updated by providing an array of role names.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID)
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminUserRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Updated Last Name"
 *             mobile: "9876543210"
 *             gender: "male"
 *             roles: ["user"]
 *             userType: "student"
 *             isActive: true
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: "User updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User updated successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Updated Last Name"
 *                   email: "user@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   roles:
 *                     - name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-15T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or invalid roles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "One or more roles are invalid"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
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
  '/:id',
  requirePermission(Section.USER, Action.UPDATE),
  validate(updateAdminUserSchema),
  userController.updateUser
);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user (admin)
 *     description: Soft delete a user. Requires user:delete permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: "User deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "User deleted successfully"
 *               data: null
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
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
router.delete('/:id', requirePermission(Section.USER, Action.DELETE), userController.deleteUser);

export default router;
