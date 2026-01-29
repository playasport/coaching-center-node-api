import { Router } from 'express';
import * as mediaController from '../../controllers/academy/coachingCenterMedia.controller';
import { uploadMedia } from '../../middleware/coachingCenterUpload.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

/**
 * @swagger
 * /admin/coaching-centers/media:
 *   post:
 *     summary: Upload coaching center media files (admin)
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload media files for coaching center (logo, images, videos, documents) in a single request.
 *       Identical to academy media upload but for admin management.
 *       
 *       **Note:** 
 *       - All files are initially saved in `temp/` folder.
 *       - Images are automatically compressed.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Media files uploaded successfully
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
 *                   example: "Media files uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     logo:
 *                       type: object
 *                       properties:
 *                         url: { type: 'string', format: 'uri' }
 *                         type: { type: 'string', example: 'logo' }
 *                     images:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'image' }
 *                     videos:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'video' }
 *                     documents:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'document' }
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadMedia,
  mediaController.uploadMedia
);

export default router;
