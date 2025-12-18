import { Router } from 'express';
import * as permissionController from '../../controllers/admin/permission.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import { validate } from '../../middleware/validation.middleware';
import {
  createPermissionSchema,
  updatePermissionSchema,
  bulkUpdatePermissionsSchema,
} from '../../validations/permission.validation';
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

// All permission routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/permissions:
 *   get:
 *     summary: Get all permissions
 *     description: Retrieve all permissions with pagination. Super Admin sees all permissions, others see only their role's permissions.
 *     tags: [Admin Permissions]
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
 *         description: Permissions retrieved successfully
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
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
 *               message: "Permissions retrieved successfully"
 *               data:
 *                 permissions:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     role:
 *                       id: "507f1f77bcf86cd799439012"
 *                       name: "admin"
 *                       description: "Administrator with elevated permissions"
 *                     section: "coaching_center"
 *                     actions: ["view", "create", "update", "delete"]
 *                     isActive: true
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 pagination:
 *                   total: 1
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 1
 *                   hasNextPage: false
 *                   hasPrevPage: false
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
router.get('/', permissionController.getPermissions);

/**
 * @swagger
 * /admin/permissions/sections:
 *   get:
 *     summary: Get available sections
 *     description: Get list of all available sections in the system
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SectionsResponse'
 *             example:
 *               success: true
 *               message: "Sections retrieved successfully"
 *               data:
 *                 sections:
 *                   - value: "coaching_center"
 *                     label: "Coaching Center"
 *                   - value: "employee"
 *                     label: "Employee"
 *                   - value: "batch"
 *                     label: "Batch"
 *                   - value: "booking"
 *                     label: "Booking"
 *                   - value: "user"
 *                     label: "User"
 */
router.get('/sections', permissionController.getAvailableSections);

/**
 * @swagger
 * /admin/permissions/actions:
 *   get:
 *     summary: Get available actions
 *     description: Get list of all available actions (view, create, update, delete)
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionsResponse'
 *             example:
 *               success: true
 *               message: "Actions retrieved successfully"
 *               data:
 *                 actions:
 *                   - value: "view"
 *                     label: "View"
 *                   - value: "create"
 *                     label: "Create"
 *                   - value: "update"
 *                     label: "Update"
 *                   - value: "delete"
 *                     label: "Delete"
 */
router.get('/actions', permissionController.getAvailableActions);

/**
 * @swagger
 * /admin/permissions/me:
 *   get:
 *     summary: Get current user's permissions
 *     description: Get simplified permissions for the logged-in admin user. Returns a map of section -> actions.
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                   example: "Permissions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: string
 *                       example:
 *                         dashboard: ["view"]
 *                         user: ["view", "create", "update"]
 *                         coaching_center: ["view", "update"]
 *                         permission: ["view", "create", "update", "delete"]
 *       401:
 *         description: Unauthorized
 */
router.get('/me', permissionController.getMyPermissions);

/**
 * @swagger
 * /admin/permissions/role/{roleId}:
 *   get:
 *     summary: Get permissions by role
 *     description: Retrieve all permissions for a specific role
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                   example: "Permissions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               message: "Permissions retrieved successfully"
 *               data:
 *                 role:
 *                   id: "507f1f77bcf86cd799439012"
 *                   name: "admin"
 *                   description: "Administrator with elevated permissions"
 *                 permissions:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     role:
 *                       id: "507f1f77bcf86cd799439012"
 *                       name: "admin"
 *                     section: "coaching_center"
 *                     actions: ["view", "create", "update"]
 *                     isActive: true
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Role not found"
 */
router.get('/role/:roleId', permissionController.getPermissionsByRole);

/**
 * @swagger
 * /admin/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     description: Retrieve a specific permission by its ID
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
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
 *                   example: "Permission retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               message: "Permission retrieved successfully"
 *               data:
 *                 permission:
 *                   id: "507f1f77bcf86cd799439011"
 *                   role:
 *                     id: "507f1f77bcf86cd799439012"
 *                     name: "admin"
 *                     description: "Administrator with elevated permissions"
 *                   section: "coaching_center"
 *                   actions: ["view", "create", "update", "delete"]
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Permission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Permission not found"
 */
router.get('/:id', permissionController.getPermissionById);

/**
 * @swagger
 * /admin/permissions:
 *   post:
 *     summary: Create permission (Super Admin only)
 *     description: Create a new permission for a role. Only Super Admin can create permissions.
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *           example:
 *             role: "507f1f77bcf86cd799439012"
 *             section: "coaching_center"
 *             actions: ["view", "create", "update"]
 *             isActive: true
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                   example: "Permission created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               message: "Permission created successfully"
 *               data:
 *                 permission:
 *                   id: "507f1f77bcf86cd799439011"
 *                   role:
 *                     id: "507f1f77bcf86cd799439012"
 *                     name: "admin"
 *                   section: "coaching_center"
 *                   actions: ["view", "create", "update"]
 *                   isActive: true
 *       400:
 *         description: Permission already exists for this role and section
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Permission already exists for this role and section"
 *       403:
 *         description: Forbidden - Super Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Super Admin only"
 */
router.post('/', requireSuperAdmin, validate(createPermissionSchema), permissionController.createPermission);

/**
 * @swagger
 * /admin/permissions/{id}:
 *   patch:
 *     summary: Update permission (Super Admin only)
 *     description: Update an existing permission. Only Super Admin can update permissions.
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePermissionRequest'
 *           example:
 *             actions: ["view", "create", "update", "delete"]
 *             isActive: true
 *     responses:
 *       200:
 *         description: Permission updated successfully
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
 *                   example: "Permission updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               message: "Permission updated successfully"
 *               data:
 *                 permission:
 *                   id: "507f1f77bcf86cd799439011"
 *                   role:
 *                     id: "507f1f77bcf86cd799439012"
 *                     name: "admin"
 *                   section: "coaching_center"
 *                   actions: ["view", "create", "update", "delete"]
 *                   isActive: true
 *       403:
 *         description: Forbidden - Super Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Super Admin only"
 *       404:
 *         description: Permission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Permission not found"
 */
router.patch('/:id', requireSuperAdmin, validate(updatePermissionSchema), permissionController.updatePermission);

/**
 * @swagger
 * /admin/permissions/{id}:
 *   delete:
 *     summary: Delete permission (Super Admin only)
 *     description: Delete a permission. Only Super Admin can delete permissions.
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Permission deleted successfully
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
 *                   example: "Permission deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Permission deleted successfully"
 *               data: null
 *       403:
 *         description: Forbidden - Super Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Super Admin only"
 *       404:
 *         description: Permission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Permission not found"
 */
router.delete('/:id', requireSuperAdmin, permissionController.deletePermission);

/**
 * @swagger
 * /admin/permissions/bulk:
 *   post:
 *     summary: Bulk update permissions for a role (Super Admin only)
 *     description: Bulk update all permissions for a specific role. This replaces all existing permissions for the role.
 *     tags: [Admin Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdatePermissionsRequest'
 *           example:
 *             role: "507f1f77bcf86cd799439012"
 *             permissions:
 *               - section: "coaching_center"
 *                 actions: ["view", "create", "update"]
 *                 isActive: true
 *               - section: "employee"
 *                 actions: ["view", "create"]
 *                 isActive: true
 *               - section: "batch"
 *                 actions: ["view"]
 *                 isActive: true
 *     responses:
 *       200:
 *         description: Permissions updated successfully
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
 *                   example: "Permissions updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               message: "Permissions updated successfully"
 *               data:
 *                 permissions:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     role:
 *                       id: "507f1f77bcf86cd799439012"
 *                       name: "admin"
 *                     section: "coaching_center"
 *                     actions: ["view", "create", "update"]
 *                     isActive: true
 *                   - id: "507f1f77bcf86cd799439013"
 *                     role:
 *                       id: "507f1f77bcf86cd799439012"
 *                       name: "admin"
 *                     section: "employee"
 *                     actions: ["view", "create"]
 *                     isActive: true
 *       403:
 *         description: Forbidden - Super Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Super Admin only"
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Role not found"
 */
router.post('/bulk', requireSuperAdmin, validate(bulkUpdatePermissionsSchema), permissionController.bulkUpdatePermissions);

export default router;
