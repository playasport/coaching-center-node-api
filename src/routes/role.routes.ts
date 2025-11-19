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
 *       **Response includes only:** `id`, `name`, and `description` fields.
 *       `visibleToRoles`, `createdAt`, and `updatedAt` are excluded from the response.
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

