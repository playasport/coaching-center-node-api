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
import roleRoutes from './role.routes';
import participantRoutes from './participant.routes';
import bookingRoutes from './booking.routes';
import webhookRoutes from './webhook.routes';
import academyRoutes from './academy.routes';
import homeRoutes from './home.routes';
import reelRoutes from './reel.routes';
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
router.use('/', basicRoutes);
router.use('/academy/coaching-center', coachingCenterRoutes);
router.use('/academy/employee', employeeRoutes);
router.use('/academy/batch', batchRoutes);
router.use('/academy/fee-type-config', feeTypeConfigRoutes);
router.use('/academy/booking', academyBookingRoutes);
router.use('/academy/my-student', studentRoutes);
router.use('/role', roleRoutes);
router.use('/webhook', webhookRoutes);
router.use('/home', homeRoutes);
router.use('/', reelRoutes);
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

