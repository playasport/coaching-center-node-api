import { Router } from 'express';
import * as academyController from '../controllers/academy.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

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
 *       Supports same filters as search API: city, state, sportId, sportIds, gender, for_disabled, min_age, max_age.
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
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Max distance in km when latitude/longitude provided. Omit or 0 = no limit.
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (location.address.city), case-insensitive partial match
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state (location.address.state), case-insensitive partial match
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter academies that offer this sport (single ID)
 *       - in: query
 *         name: sportIds
 *         schema:
 *           type: string
 *         description: Filter academies that offer any of these sports (comma-separated IDs)
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other]
 *         description: Filter by allowed gender
 *       - in: query
 *         name: for_disabled
 *         schema:
 *           type: boolean
 *         description: If true or 1, only academies where allowed_disabled is true
 *       - in: query
 *         name: min_age
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter by age range – minimum age (years). Academies whose age range overlaps [min_age, max_age] are included.
 *       - in: query
 *         name: max_age
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter by age range – maximum age (years). Academies whose age range overlaps [min_age, max_age] are included.
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
 *       Get detailed information about an academy including all batches and latest 5 ratings.
 *       Supports multiple ID types:
 *       - CoachingCenter UUID (id field): e.g., "784d4s4447444s5s44s4s4s4s4s4s4s4s78"
 *       - MongoDB ObjectId (_id): e.g., "693bc2d1d0b08eea0c31cc53"
 *       - User custom ID: searches by academy owner's user ID
 *       Response includes: ratings (latest 5), averageRating, totalRatings.
 *       When user is logged in: their rating appears first in ratings (if they rated), isAlreadyRated and canUpdateRating indicate if they have rated and can update it.
 *       If user is not logged in, email and mobile number will be masked.
 *       Authentication is optional.
 *     security:
 *       - bearerAuth: []
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
 *                   $ref: '#/components/schemas/AcademyDetail'
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
 * /academies/{id}/rate:
 *   post:
 *     summary: Submit or update rating for a coaching center
 *     tags: [Academy]
 *     description: One rating per user per center. Authenticated user can submit or update their rating (1-5). Optional comment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID (UUID or MongoDB ObjectId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Rating submitted or updated successfully
 *       400:
 *         description: Invalid rating or center ID
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/rate', authenticate, academyController.submitRating);

/**
 * @swagger
 * /academies/{id}/ratings:
 *   get:
 *     summary: Get paginated ratings for a coaching center
 *     tags: [Academy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Paginated ratings list with averageRating and totalRatings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Rating with id, rating, comment, createdAt, user
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 *                     totalRatings:
 *                       type: integer
 */
router.get('/:id/ratings', optionalAuthenticate, academyController.getRatingsByAcademyId);

/**
 * @swagger
 * /city/{cityName}:
 *   get:
 *     summary: Get academies by city name
 *     tags: [Academy]
 *     description: Get list of academies in a specific city with sport-specific data and images. Returns academies with one image from sport_details per academy. This is an unprotected route.
 *     parameters:
 *       - in: path
 *         name: cityName
 *         required: true
 *         schema:
 *           type: string
 *         description: City name (case-insensitive)
 *         example: "Kolkata"
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
 *         description: Academies retrieved successfully with sport-specific data and images
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
 *                       description: List of academies with sport-specific data and one image per academy
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

