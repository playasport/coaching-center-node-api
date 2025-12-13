import { Router } from 'express';
import * as homeController from '../controllers/home.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Home
 *   description: Home page data endpoints
 */

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Get home page data (nearby academies, popular sports, and popular reels)
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude for location-based sorting (optional)
 *         example: 28.6139
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude for location-based sorting (optional)
 *         example: 77.2090
 *     responses:
 *       200:
 *         description: Home data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Home data retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/HomeData'
 *       400:
 *         description: Invalid location coordinates
 *       500:
 *         description: Internal server error
 */
router.get('/', optionalAuthenticate, homeController.getHomeData);

export default router;

