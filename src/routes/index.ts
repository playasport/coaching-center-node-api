import { Router } from 'express';
import path from 'path';
import localeRoutes from './locale.routes';
import academyAuthRoutes from './academyAuth.routes';
import locationRoutes from './location.routes';
import basicRoutes from './basic.routes';
import coachingCenterRoutes from './coachingCenter.routes';
import employeeRoutes from './employee.routes';
import roleRoutes from './role.routes';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use('/locale', localeRoutes);
router.use('/academy/auth', academyAuthRoutes);
router.use('/location', locationRoutes);
router.use('/', basicRoutes);
router.use('/academy/coaching-center', coachingCenterRoutes);
router.use('/academy/employee', employeeRoutes);
router.use('/role', roleRoutes);
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

export default router;

