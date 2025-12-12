import { Router } from 'express';
import path from 'path';
import localeRoutes from './locale.routes';
import academyAuthRoutes from './academy/academyAuth.routes';
import userAuthRoutes from './userAuth.routes';
import locationRoutes from './location.routes';
import basicRoutes from './basic.routes';
import coachingCenterRoutes from './academy/coachingCenter.routes';
import employeeRoutes from './academy/employee.routes';
import batchRoutes from './academy/batch.routes';
import feeTypeConfigRoutes from './academy/feeTypeConfig.routes';
import academyBookingRoutes from './academy/booking.routes';
import roleRoutes from './role.routes';
import participantRoutes from './participant.routes';
import bookingRoutes from './booking.routes';
import webhookRoutes from './webhook.routes';
import academyRoutes from './academy.routes';
import homeRoutes from './home.routes';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use('/locale', localeRoutes);
router.use('/academy/auth', academyAuthRoutes);
router.use('/user/auth', userAuthRoutes);
router.use('/user/participant', participantRoutes);
router.use('/user/booking', bookingRoutes);
router.use('/location', locationRoutes);
router.use('/', basicRoutes);
router.use('/academy/coaching-center', coachingCenterRoutes);
router.use('/academy/employee', employeeRoutes);
router.use('/academy/batch', batchRoutes);
router.use('/academy/fee-type-config', feeTypeConfigRoutes);
router.use('/academy/booking', academyBookingRoutes);
router.use('/role', roleRoutes);
router.use('/webhook', webhookRoutes);
router.use('/home', homeRoutes);
// Public academy routes - must be registered after other routes to avoid conflicts
router.use('/', academyRoutes);
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

