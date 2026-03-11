import { Router } from 'express';
import * as ratingController from '../controllers/rating.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /user/ratings:
 *   get:
 *     summary: Get all ratings submitted by the authenticated user
 *     tags: [User Ratings]
 *     description: Retrieve a paginated list of all ratings the authenticated user has submitted across all coaching centers. Includes rating value, comment, status (pending/approved/rejected), and coaching center details.
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
 *         description: Records per page
 *     responses:
 *       200:
 *         description: User ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User ratings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           rating:
 *                             type: integer
 *                             minimum: 1
 *                             maximum: 5
 *                           comment:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           coaching_center:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               center_name:
 *                                 type: string
 *                               logo:
 *                                 type: string
 *                                 nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 8
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *                         hasNextPage:
 *                           type: boolean
 *                           example: false
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/',
  authenticate,
  ratingController.getUserRatings
);

export default router;
