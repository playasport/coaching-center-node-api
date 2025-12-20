import { Router } from 'express';
import path from 'path';
import localeRoutes from './locale.routes';
import academyAuthRoutes from './academy/academyAuth.routes';
import userAuthRoutes from './userAuth.routes';
import locationRoutes from './location.routes';
import * as locationController from '../controllers/location.controller';
import basicRoutes from './basic.routes';
import coachingCenterRoutes from './academy/coachingCenter.routes';
import employeeRoutes from './academy/employee.routes';
import batchRoutes from './academy/batch.routes';
import feeTypeConfigRoutes from './academy/feeTypeConfig.routes';
import academyBookingRoutes from './academy/booking.routes';
import studentRoutes from './academy/student.routes';
import academyBannerRoutes from './academy/banner.routes';
import roleRoutes from './role.routes';
import participantRoutes from './participant.routes';
import bookingRoutes from './booking.routes';
import webhookRoutes from './webhook.routes';
import academyRoutes from './academy.routes';
import homeRoutes from './home.routes';
import reelRoutes from './reel.routes';
import settingsRoutes from './settings.routes';
import bannerRoutes from './banner.routes';
import cmsPageRoutes from './cmsPage.routes';
import adminRoutes from './admin';
import * as academyController from '../controllers/academy.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use('/locale', localeRoutes);
router.use('/academy/auth', academyAuthRoutes);
router.use('/user/auth', userAuthRoutes);
router.use('/user/participant', participantRoutes);
router.use('/user/booking', bookingRoutes);
router.use('/location', locationRoutes);

/**
 * @swagger
 * /top-cities:
 *   get:
 *     summary: Get top 15 cities with academy and sports counts
 *     tags: [Location]
 *     description: Retrieve the top 15 cities based on the number of active academies. Returns city name, academy count, and unique sports count for each city.
 *     responses:
 *       200:
 *         description: Top cities retrieved successfully
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
 *                   example: "Top cities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TopCity'
 *       500:
 *         description: Server error
 */
router.get('/top-cities', locationController.getTopCities);

/**
 * @swagger
 * /city/{cityName}:
 *   get:
 *     summary: Get academies by city name (alias route)
 *     tags: [Academy]
 *     description: Get list of academies in a specific city with sport-specific data and images. Returns academies with one image from sport_details per academy. This is an alias for /academies/city/{cityName}. This is an unprotected route.
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
 *     summary: Get academies by sport slug (alias route)
 *     tags: [Academy]
 *     description: Get academies that offer a specific sport. This is an alias for /academies/sport/{slug}. If location (latitude, longitude) is provided, academies are sorted by distance (nearest first) and distance is shown in km. This is an unprotected route.
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
 *       404:
 *         description: Sport not found
 */
router.get('/sport/:slug', optionalAuthenticate, academyController.getAcademiesBySport);

router.use('/', basicRoutes);
router.use('/academy/coaching-center', coachingCenterRoutes);
router.use('/academy/employee', employeeRoutes);
router.use('/academy/batch', batchRoutes);
router.use('/academy/fee-type-config', feeTypeConfigRoutes);
router.use('/academy/booking', academyBookingRoutes);
router.use('/academy/my-student', studentRoutes);
router.use('/academy/banners', academyBannerRoutes);
router.use('/role', roleRoutes);
router.use('/webhook', webhookRoutes);
router.use('/home', homeRoutes);
router.use('/', reelRoutes);
router.use('/settings', settingsRoutes);
router.use('/banners', bannerRoutes);
router.use('/pages', cmsPageRoutes);
// Admin routes - must be registered before public routes to avoid conflicts
router.use('/admin', adminRoutes);
// Public academy routes - must be registered after other routes to avoid conflicts
router.use('/academies', academyRoutes);
router.get('/health', (_req, res) => {
  const response = new ApiResponse(200, { timestamp: new Date().toISOString() }, t('health.serverRunning'));
  res.json(response);
});

router.get('/demo/social-login', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'docs', 'social-login-demo.html');
  res.sendFile(filePath);
});

router.get('/demo/coaching-center', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'docs', 'coaching-center-test.html');
  res.sendFile(filePath);
});

router.get('/demo/batch-create', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'docs', 'batch-create-demo.html');
  res.sendFile(filePath);
});

router.get('/demo/booking-payment', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'docs', 'booking-payment-demo.html');
  res.sendFile(filePath);
});

export default router;

