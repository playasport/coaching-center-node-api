import { Router } from 'express';
import * as roleController from '../../controllers/admin/role.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import { validate } from '../../middleware/validation.middleware';
import { createRoleSchema, updateRoleSchema } from '../../validations/role.validation';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { UserModel } from '../../models/user.model';

// Middleware to check if user is super admin
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await UserModel.findOne({ id: req.user.id })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    const userRoles = user?.roles as any[];
    const isSuperAdmin = userRoles?.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);

    if (!isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden - Super Admin only' });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Get all roles (admin)
 *     description: Retrieve all roles in the system with pagination. Requires role:view permission.
 *     tags: [Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *             example:
 *               success: true
 *               message: "Roles retrieved successfully"
 *               data:
 *                 roles:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     name: "super_admin"
 *                     description: "Super Administrator with full system access"
 *                     visibleToRoles: null
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 pagination:
 *                   total: 6
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 1
 *                   hasNextPage: false
 *                   hasPrevPage: false
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  requirePermission(Section.ROLE, Action.VIEW),
  roleController.getAllRoles
);

/**
 * @swagger
 * /admin/roles/{id}:
 *   get:
 *     summary: Get role by ID (admin)
 *     description: Retrieve a specific role by ID. Requires role:view permission.
 *     tags: [Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Role retrieved successfully
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
 *                   example: "Role retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *             example:
 *               success: true
 *               message: "Role retrieved successfully"
 *               data:
 *                 role:
 *                   id: "507f1f77bcf86cd799439011"
 *                   name: "admin"
 *                   description: "Administrator with elevated permissions"
 *                   visibleToRoles: null
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Role not found
 */
router.get(
  '/:id',
  requirePermission(Section.ROLE, Action.VIEW),
  roleController.getRoleById
);

/**
 * @swagger
 * /admin/roles:
 *   post:
 *     summary: Create role (Super Admin only)
 *     description: Create a new role. Only Super Admin can create roles. Default system roles cannot be created.
 *     tags: [Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *           example:
 *             name: "manager"
 *             description: "Manager role with management permissions"
 *             visibleToRoles: ["super_admin", "admin"]
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                   example: "Role created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *             example:
 *               success: true
 *               message: "Role created successfully"
 *               data:
 *                 role:
 *                   id: "507f1f77bcf86cd799439014"
 *                   name: "manager"
 *                   description: "Manager role with management permissions"
 *                   visibleToRoles: ["super_admin", "admin"]
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or role name already exists
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post(
  '/',
  requireSuperAdmin,
  requirePermission(Section.ROLE, Action.CREATE),
  validate(createRoleSchema),
  roleController.createRole
);

/**
 * @swagger
 * /admin/roles/{id}:
 *   patch:
 *     summary: Update role (Super Admin only)
 *     description: Update a role. Only Super Admin can update roles. Default roles can only have description and visibleToRoles updated.
 *     tags: [Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *           example:
 *             description: "Updated description"
 *             visibleToRoles: ["super_admin", "admin", "academy"]
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *                   example: "Role updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *       400:
 *         description: Bad request - validation error
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Role not found
 */
router.patch(
  '/:id',
  requireSuperAdmin,
  requirePermission(Section.ROLE, Action.UPDATE),
  validate(updateRoleSchema),
  roleController.updateRole
);

/**
 * @swagger
 * /admin/roles/{id}:
 *   delete:
 *     summary: Delete role (Super Admin only)
 *     description: Delete a role. Only Super Admin can delete roles. Default system roles cannot be deleted. Role must not be assigned to any users.
 *     tags: [Admin Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Role deleted successfully
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
 *                   example: "Role deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Role deleted successfully"
 *               data: null
 *       400:
 *         description: Bad request - Cannot delete default role or role is assigned to users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Cannot delete role. 5 user(s) are assigned to this role"
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Role not found
 */
router.delete(
  '/:id',
  requireSuperAdmin,
  requirePermission(Section.ROLE, Action.DELETE),
  roleController.deleteRole
);

export default router;
