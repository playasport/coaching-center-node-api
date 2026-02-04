import { Router } from 'express';
import * as mediaController from '../../controllers/academy/coachingCenterMedia.controller';
import { uploadMedia } from '../../middleware/coachingCenterUpload.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/coaching-center/media:
 *   post:
 *     summary: Upload coaching center media files
 *     tags: [Coaching Center Media]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload media files for coaching center (logo, images, videos, documents) in a single request.
 *       
 *       **Note:** 
 *       - All files are initially saved in `temp/` folder.
 *       - Files are automatically moved to permanent locations when coaching center status changes to 'published'.
 *       - Images (logo and images) are automatically compressed (max width: 1500px, max size: 500KB).
 *       
 *       **File Limits:**
 *       - Logo: 1 file (JPEG, PNG, WebP) - max 5MB
 *       - Images: up to 10 files (JPEG, PNG, WebP) - max 5MB each
 *       - Videos: up to 10 files (MP4, MPEG, MOV, AVI) - max 100MB each
 *       - Documents: up to 10 files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG) - max 10MB each
 *       
 *       **File Paths:**
 *       - Logo: `temp/coaching/photo/{uuid}.{ext}` → `coaching/photo/{uuid}.{ext}`
 *       - Images: `temp/images/coachingCentres/{uuid}.{ext}` → `images/coachingCentres/{uuid}.{ext}`
 *       - Videos: `temp/videos/coachingCentres/{uuid}.{ext}` → `videos/coachingCentres/{uuid}.{ext}`
 *       - Documents: `temp/documents/coachingCentres/{uuid}.{ext}` → `documents/coachingCentres/{uuid}.{ext}`
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
 *                 description: Logo image file (JPEG, PNG, WebP) - single file. Field name may be "logo" or "logo[]".
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (JPEG, PNG, WebP) - up to 10 files. Field name may be "images" or "images[]".
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Video files (MP4, MPEG, MOV, AVI) - up to 10 files, max 100MB each. Field name may be "videos" or "videos[]".
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Document files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG) - up to 10 files, max 10MB each. Field name may be "documents" or "documents[]".
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
 *                         url:
 *                           type: string
 *                           format: uri
 *                           example: "https://bucket.s3.region.amazonaws.com/temp/coaching/photo/uuid.jpg"
 *                         type:
 *                           type: string
 *                           example: "logo"
 *                     images:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                           example: ["https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid.jpg"]
 *                         count:
 *                           type: number
 *                           example: 2
 *                         type:
 *                           type: string
 *                           example: "image"
 *                     videos:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                         count:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "video"
 *                     documents:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                         count:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "document"
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  uploadMedia,
  mediaController.uploadMedia
);

export default router;
