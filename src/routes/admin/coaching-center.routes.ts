import { Router } from 'express';
import * as coachingCenterController from '../../controllers/admin/coachingCenter.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/coaching-centers:
 *   get:
 *     summary: Get all coaching centers (admin)
 *     description: Retrieve paginated list of all coaching centers with user and sport details. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
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
 *         description: Coaching centers retrieved successfully
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
 *                   example: "Coaching centers retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenters:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *             example:
 *               success: true
 *               message: "Coaching centers retrieved successfully"
 *               data:
 *                 coachingCenters:
 *                   - id: "cc-123"
 *                     center_name: "Elite Sports Academy"
 *                     email: "elite@example.com"
 *                     status: "published"
 *                     is_active: true
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 150
 *                   totalPages: 15
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
router.get(
  '/',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getAllCoachingCenters
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   get:
 *     summary: Get coaching center by ID (admin)
 *     description: Retrieve a specific coaching center by ID. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
 *     responses:
 *       200:
 *         description: Coaching center retrieved successfully
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
 *                   example: "Coaching center retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       type: object
 *             example:
 *               success: true
 *               message: "Coaching center retrieved successfully"
 *               data:
 *                 coachingCenter:
 *                   id: "cc-123"
 *                   center_name: "Elite Sports Academy"
 *                   email: "elite@example.com"
 *                   status: "published"
 *                   is_active: true
 *       404:
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.get(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getCoachingCenter
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   patch:
 *     summary: Update coaching center (admin)
 *     description: Update a coaching center. Requires coaching_center:update permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoachingCenterUpdateRequest'
 *           example:
 *             center_name: "Updated Elite Sports Academy"
 *             status: "published"
 *     responses:
 *       200:
 *         description: Coaching center updated successfully
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
 *                   example: "Coaching center updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       type: object
 *             example:
 *               success: true
 *               message: "Coaching center updated successfully"
 *               data:
 *                 coachingCenter:
 *                   id: "cc-123"
 *                   center_name: "Updated Elite Sports Academy"
 *                   status: "published"
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
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.patch(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  coachingCenterController.updateCoachingCenter
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   delete:
 *     summary: Delete coaching center (admin)
 *     description: Delete a coaching center. Requires coaching_center:delete permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
 *     responses:
 *       200:
 *         description: Coaching center deleted successfully
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
 *                   example: "Coaching center deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Coaching center deleted successfully"
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
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.delete(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.DELETE),
  coachingCenterController.deleteCoachingCenter
);

export default router;
