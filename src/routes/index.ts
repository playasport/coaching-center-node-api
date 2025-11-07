import { Router } from 'express';
import authRoutes from './auth.routes';
import localeRoutes from './locale.routes';
import { t } from '../utils/i18n';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locale', localeRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
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
 *                   example: Server is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: t('health.serverRunning'),
    timestamp: new Date().toISOString(),
  });
});

export default router;

