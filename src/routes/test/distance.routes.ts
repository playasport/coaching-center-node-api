import { Router } from 'express';
import * as distanceController from '../../controllers/test/distance.controller';

const router = Router();

/**
 * @swagger
 * /test/distance:
 *   get:
 *     summary: Test distance calculation between two points
 *     tags: [Test - Distance]
 *     description: |
 *       Returns the distance (in km) between two coordinates and which service was used:
 *       - **cache**: Redis cache (previously computed result)
 *       - **google_maps**: Google Maps Distance Matrix API (road/driving distance)
 *       - **haversine**: Haversine formula (straight-line distance, used when API key is not set or API fails)
 *     parameters:
 *       - in: query
 *         name: lat1
 *         required: true
 *         schema:
 *           type: number
 *         description: Origin latitude (-90 to 90)
 *         example: 28.6139
 *       - in: query
 *         name: lon1
 *         required: true
 *         schema:
 *           type: number
 *         description: Origin longitude (-180 to 180)
 *         example: 77.2090
 *       - in: query
 *         name: lat2
 *         required: true
 *         schema:
 *           type: number
 *         description: Destination latitude (-90 to 90)
 *         example: 19.0760
 *       - in: query
 *         name: lon2
 *         required: true
 *         schema:
 *           type: number
 *         description: Destination longitude (-180 to 180)
 *         example: 72.8777
 *     responses:
 *       200:
 *         description: Distance calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     distance:
 *                       type: number
 *                       description: Distance in kilometers
 *                     method:
 *                       type: string
 *                       enum: [cache, google_maps, haversine]
 *                     methodDescription:
 *                       type: string
 *                     origin:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lon:
 *                           type: number
 *                     destination:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lon:
 *                           type: number
 *       400:
 *         description: Invalid or missing parameters
 */
router.get('/', distanceController.testDistance);

export default router;
