import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import * as coachingCenterRatingController from '../../controllers/academy/coachingCenterRating.controller';

const router = Router();

router.use(authenticate);
router.use(authorize(DefaultRoles.ACADEMY));

/**
 * @swagger
 * /academy/ratings:
 *   get:
 *     summary: List ratings for academy's coaching centers
 *     tags: [Academy Ratings]
 *     description: Get a paginated list of ratings for coaching centers owned by the authenticated academy. Optional filters by status and coachingCenterId.
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
 *         description: Filter by rating status
 *       - in: query
 *         name: coachingCenterId
 *         schema:
 *           type: string
 *         description: Filter by one of your coaching center IDs
 *     responses:
 *       200:
 *         description: Ratings list with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not academy role)
 */
router.get('/', coachingCenterRatingController.getRatings);

/**
 * @swagger
 * /academy/ratings/{id}:
 *   get:
 *     summary: Get a single rating by id
 *     tags: [Academy Ratings]
 *     description: Get one rating. Only returns the rating if it belongs to one of the academy's coaching centers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating document ID (MongoDB _id)
 *     responses:
 *       200:
 *         description: Rating details
 *       404:
 *         description: Rating not found
 */
router.get('/:id', coachingCenterRatingController.getRatingById);

/**
 * @swagger
 * /academy/ratings/{id}/status:
 *   patch:
 *     summary: Update rating status (approve / reject / pending)
 *     tags: [Academy Ratings]
 *     description: Set a rating's status. Only allowed for ratings belonging to the academy's coaching centers.
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
  coachingCenterRatingController.updateRatingStatus
);

export default router;
