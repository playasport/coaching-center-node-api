import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section, Action } from '../../enums/section.enum';
import * as coachingCenterRatingController from '../../controllers/admin/coachingCenterRating.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/ratings:
 *   get:
 *     summary: Get paginated coaching center ratings (admin)
 *     tags: [Admin Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: coachingCenterId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings list with pagination
 */
router.get(
  '/',
  requirePermission(Section.COACHING_CENTER_RATINGS, Action.VIEW),
  coachingCenterRatingController.getRatings
);

/**
 * @swagger
 * /admin/ratings/{id}:
 *   get:
 *     summary: Get a single rating by id (admin)
 *     tags: [Admin Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rating details
 *       404:
 *         description: Rating not found
 */
router.get(
  '/:id',
  requirePermission(Section.COACHING_CENTER_RATINGS, Action.VIEW),
  coachingCenterRatingController.getRatingById
);

/**
 * @swagger
 * /admin/ratings/{id}/status:
 *   patch:
 *     summary: Update rating status (approve / reject / pending)
 *     tags: [Admin Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *     responses:
 *       200:
 *         description: Rating status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Rating not found
 */
router.patch(
  '/:id/status',
  requirePermission(Section.COACHING_CENTER_RATINGS, Action.UPDATE),
  coachingCenterRatingController.updateRatingStatus
);

export default router;
