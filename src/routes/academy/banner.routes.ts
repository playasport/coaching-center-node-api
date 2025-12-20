import { Router } from 'express';
import * as bannerController from '../../controllers/academy/banner.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Academy Banners
 *   description: Banner endpoints for coaching centers
 */

/**
 * @swagger
 * /academy/banners:
 *   get:
 *     summary: Get all banners for coaching center
 *     tags: [Academy Banners]
 *     description: Get all active banners that are displayed on the coaching center's page. Returns banners grouped by position.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter banners by sport ID (optional)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum number of banners per position
 *         example: 5
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                   example: "Banners retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     banners:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                       example:
 *                         center_page:
 *                           - id: "550e8400-e29b-41d4-a716-446655440000"
 *                             title: "Elite Academy Special Offer"
 *                             imageUrl: "https://bucket.s3.region.amazonaws.com/banners/elite-academy.jpg"
 *                             linkUrl: "/centers/elite-academy"
 *                             linkType: "internal"
 *                             position: "center_page"
 *                             priority: 10
 *                         homepage_top:
 *                           - id: "660e8400-e29b-41d4-a716-446655440001"
 *                             title: "Summer Sports Camp"
 *                             imageUrl: "https://bucket.s3.region.amazonaws.com/banners/summer.jpg"
 *                             linkUrl: "/campaigns/summer"
 *                             linkType: "internal"
 *                             position: "homepage_top"
 *                             priority: 8
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, bannerController.getAllCenterBanners);

/**
 * @swagger
 * /academy/banners/{position}:
 *   get:
 *     summary: Get banners by position for coaching center
 *     tags: [Academy Banners]
 *     description: Get active banners for a specific position that are displayed on the coaching center's page.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position
 *         required: true
 *         schema:
 *           type: string
 *           enum: [homepage_top, homepage_middle, homepage_bottom, category_top, category_sidebar, sport_page, center_page, search_results, mobile_app_home, mobile_app_category]
 *         description: Banner position
 *         example: center_page
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter banners by sport ID (optional)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of banners to return
 *         example: 5
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                   example: "Banners retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     banners:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example:
 *                         - id: "550e8400-e29b-41d4-a716-446655440000"
 *                           title: "Elite Academy Special Offer"
 *                           description: "Special discount for new students"
 *                           imageUrl: "https://bucket.s3.region.amazonaws.com/banners/elite-academy.jpg"
 *                           mobileImageUrl: "https://bucket.s3.region.amazonaws.com/banners/elite-academy-mobile.jpg"
 *                           linkUrl: "/centers/elite-academy"
 *                           linkType: "internal"
 *                           position: "center_page"
 *                           priority: 10
 *       400:
 *         description: Invalid banner position
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:position', authenticate, bannerController.getCenterBanners);

export default router;

