import { Router } from 'express';
import * as operationalUserController from '../../controllers/admin/operationalUser.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import { validate } from '../../middleware/validation.middleware';
import { createOperationalUserSchema, updateOperationalUserSchema } from '../../validations/operationalUser.validation';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/operational-users:
 *   post:
 *     summary: Create operational user (admin)
 *     description: Create a new user with any role except user, academy, or super_admin. A secure random password will be automatically generated and sent to the user's email. Requires operational_user:create permission. Any role created via role routes can be assigned, except "super_admin", "user", and "academy" which cannot be assigned.
 *     tags: [Admin Operational Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - roles
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               firstName:
 *                 type: string
 *                 example: "Admin"
 *               lastName:
 *                 type: string
 *                 nullable: true
 *                 example: "User"
 *               mobile:
 *                 type: string
 *                 nullable: true
 *                 example: "9876543210"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 nullable: true
 *               dob:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["admin"]
 *                 description: Any role except "super_admin", "user", or "academy"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               address:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   line1:
 *                     type: string
 *                     nullable: true
 *                   line2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                     default: "India"
 *                   pincode:
 *                     type: string
 *                     pattern: "^[0-9]{6}$"
 *     responses:
 *       201:
 *         description: Operational user created successfully
 *       400:
 *         description: Bad request - validation error or email already exists
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  requirePermission(Section.OPERATIONAL_USER, Action.CREATE),
  validate(createOperationalUserSchema),
  operationalUserController.createOperationalUser
);

/**
 * @swagger
 * /admin/operational-users:
 *   get:
 *     summary: Get all operational users (admin)
 *     description: |
 *       Retrieve paginated list of users with any role except "user", "academy", or "super_admin". Users with these excluded roles are not shown.
 *       
 *       **Available Filters:**
 *       - `search`: Search by first name, last name, email, or mobile number
 *       - `isActive`: Filter by active status (true/false)
 *       - `role`: Filter by role name (any role except user, academy, super_admin)
 *       
 *       **Filter Examples:**
 *       - Get all admins: `?role=admin`
 *       - Get all employees: `?role=employee`
 *       - Get users with custom role: `?role=custom_role_name`
 *       - Search users: `?search=john`
 *       - Active users only: `?isActive=true`
 *       - Combine filters: `?role=admin&isActive=true&search=john`
 *       
 *       Requires operational_user:view permission.
 *     tags: [Admin Operational Users]
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, email, or mobile number
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role name (any role except user, academy, super_admin)
 *     responses:
 *       200:
 *         description: Operational users retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', requirePermission(Section.OPERATIONAL_USER, Action.VIEW), operationalUserController.getAllOperationalUsers);

/**
 * @swagger
 * /admin/operational-users/{id}:
 *   get:
 *     summary: Get operational user by ID (admin)
 *     description: Retrieve a specific operational user by ID. Only returns users with roles other than user, academy, or super_admin. Requires operational_user:view permission.
 *     tags: [Admin Operational Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format)
 *     responses:
 *       200:
 *         description: Operational user retrieved successfully
 *       404:
 *         description: Operational user not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/:id', requirePermission(Section.OPERATIONAL_USER, Action.VIEW), operationalUserController.getOperationalUser);

/**
 * @swagger
 * /admin/operational-users/{id}:
 *   patch:
 *     summary: Update operational user (admin)
 *     description: Update an operational user. Requires operational_user:update permission. All fields are optional. Roles can be updated by providing an array of role names. Any role except "super_admin", "user", and "academy" can be assigned. Email can only be updated by super_admin. Password field is not available in update - use password reset flow instead.
 *     tags: [Admin Operational Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *                 nullable: true
 *               mobile:
 *                 type: string
 *                 nullable: true
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 nullable: true
 *               dob:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Any role except "super_admin", "user", or "academy"
 *               isActive:
 *                 type: boolean
 *               address:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Operational user updated successfully
 *       400:
 *         description: Bad request - validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Operational user not found
 */
router.patch(
  '/:id',
  requirePermission(Section.OPERATIONAL_USER, Action.UPDATE),
  validate(updateOperationalUserSchema),
  operationalUserController.updateOperationalUser
);

/**
 * @swagger
 * /admin/operational-users/{id}:
 *   delete:
 *     summary: Delete operational user (admin)
 *     description: Soft delete an operational user. Requires operational_user:delete permission.
 *     tags: [Admin Operational Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format)
 *     responses:
 *       200:
 *         description: Operational user deleted successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Operational user not found
 */
router.delete('/:id', requirePermission(Section.OPERATIONAL_USER, Action.DELETE), operationalUserController.deleteOperationalUser);

export default router;

