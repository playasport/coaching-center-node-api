import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /role:
 *   get:
 *     summary: Get list of roles visible to logged-in user
 *     tags: [Role]
 *     description: |
 *       Retrieve a list of roles that the logged-in user can view based on their role.
 *       - SUPER_ADMIN and ADMIN can see all roles
 *       - Other roles can only see roles where their role is included in the `visibleToRoles` array
 *       
 *       **Response includes:** `id`, `name`, `description`, `isSystemDefined`, and `userCount` fields.
 *       - `isSystemDefined`: Indicates if the role is a system-defined role (cannot be deleted or have name changed)
 *       - `userCount`: Number of active users assigned to this role
 *       - `visibleToRoles`, `createdAt`, and `updatedAt` are excluded from the response.
 *     security:
 *       - bearerAuth: []
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Roles retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     count:
 *                       type: number
 *                       example: 2
 *             example:
 *               success: true
 *               message: "Roles retrieved successfully"
 *               data:
 *                 roles:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     name: "super_admin"
 *                     description: "Super Administrator with full system access"
 *                     isSystemDefined: true
 *                     userCount: 1
 *                   - id: "507f1f77bcf86cd799439012"
 *                     name: "academy"
 *                     description: "Academy user with coaching center management permissions"
 *                     isSystemDefined: true
 *                     userCount: 15
 *                   - id: "507f1f77bcf86cd799439013"
 *                     name: "custom_role"
 *                     description: "Custom role created by admin"
 *                     isSystemDefined: false
 *                     userCount: 3
 *                 count: 3
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authenticate,
  roleController.getRoles
);

export default router;

