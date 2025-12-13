import { Router } from 'express';
import * as academyController from '../controllers/academy.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /academies:
 *   get:
 *     summary: Get all academies with pagination
 *     tags: [Academy]
 *     description: |
 *       Get all published academies with pagination.
 *       If location (latitude, longitude) is provided, academies are sorted by distance (nearest first).
 *       If user is logged in and has favorite sports, academies with favorite sports are prioritized.
 *       This is an unprotected route.
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
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude (optional, for distance-based sorting)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude (optional, for distance-based sorting)
 *     responses:
 *       200:
 *         description: Academies retrieved successfully
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
 *                   example: "Academies retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AcademyListItem'
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
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', optionalAuthenticate, academyController.getAllAcademies);

/**
 * @swagger
 * /academies/{id}:
 *   get:
 *     summary: Get academy details by ID
 *     tags: [Academy]
 *     description: |
 *       Get detailed information about an academy including all batches.
 *       Supports multiple ID types:
 *       - CoachingCenter UUID (id field): e.g., "784d4s4447444s5s44s4s4s4s4s4s4s4s78"
 *       - MongoDB ObjectId (_id): e.g., "693bc2d1d0b08eea0c31cc53"
 *       - User custom ID: searches by academy owner's user ID
 *       If user is not logged in, email and mobile number will be masked.
 *       This is an unprotected route (authentication is optional).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           Academy identifier. Supports:
 *           - CoachingCenter UUID (id field)
 *           - MongoDB ObjectId (_id)
 *           - User custom ID (academy owner's user ID)
 *         examples:
 *           uuid:
 *             value: "784d4s4447444s5s44s4s4s4s4s4s4s4s78"
 *             summary: CoachingCenter UUID
 *           objectId:
 *             value: "693bc2d1d0b08eea0c31cc53"
 *             summary: MongoDB ObjectId
 *           userCustomId:
 *             value: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *             summary: User custom ID
 *     responses:
 *       200:
 *         description: Academy retrieved successfully
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
 *                   example: "Academy retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     academy:
 *                       $ref: '#/components/schemas/AcademyDetail'
 *       404:
 *         description: Academy not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', optionalAuthenticate, academyController.getAcademyById);

/**
 * @swagger
 * /city/{cityName}:
 *   get:
 *     summary: Get academies by city name
 *     tags: [Academy]
 *     description: Get list of academies in a specific city. This is an unprotected route.
 *     parameters:
 *       - in: path
 *         name: cityName
 *         required: true
 *         schema:
 *           type: string
 *         description: City name (case-insensitive)
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
 *         description: Academies retrieved successfully
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
 *                   example: "Academies retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AcademyListItem'
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
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 */
router.get('/city/:cityName', academyController.getAcademiesByCity);

/**
 * @swagger
 * /sport/{slug}:
 *   get:
 *     summary: Get academies by sport slug
 *     tags: [Academy]
 *     description: |
 *       Get academies that offer a specific sport.
 *       If location (latitude, longitude) is provided, academies are sorted by distance (nearest first) and distance is shown in km.
 *       This is an unprotected route.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Sport slug (e.g., 'cricket', 'football')
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
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude (optional, for distance-based sorting)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude (optional, for distance-based sorting)
 *     responses:
 *       200:
 *         description: Academies retrieved successfully
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
 *                   example: "Academies retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AcademyListItem'
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
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       404:
 *         description: Sport not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sport/:slug', optionalAuthenticate, academyController.getAcademiesBySport);

export default router;

