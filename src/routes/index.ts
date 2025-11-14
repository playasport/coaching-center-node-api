import { Router } from 'express';
import path from 'path';
import localeRoutes from './locale.routes';
import academyAuthRoutes from './academyAuth.routes';
import locationRoutes from './location.routes';
import sportRoutes from './sport.routes';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use('/locale', localeRoutes);
router.use('/academy/auth', academyAuthRoutes);
router.use('/location', locationRoutes);
router.use('/sport', sportRoutes);
router.get('/health', (_req, res) => {
  const response = new ApiResponse(200, { timestamp: new Date().toISOString() }, t('health.serverRunning'));
  res.json(response);
});

router.get('/demo/social-login', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'docs', 'social-login-demo.html');
  res.sendFile(filePath);
});

export default router;

