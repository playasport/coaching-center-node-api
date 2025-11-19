import { Router } from 'express';
import * as mediaController from '../../controllers/academy/employeeMedia.controller';
import { uploadCertification } from '../../middleware/employeeUpload.middleware';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /academy/employee/media:
 *   post:
 *     summary: Upload employee certification files
 *     tags: [Employee Media]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload certification documents for employees.
 *       
 *       **File Limits:**
 *       - Certifications: up to 10 files (PDF, JPEG, PNG, WebP) - max 10MB each
 *       
 *       **File Paths:**
 *       - Certifications: `temp/images/coaching/employee/{uuid}.{ext}`
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Certification files (PDF, JPEG, PNG, WebP) - up to 10 files, max 10MB each
 *     responses:
 *       200:
 *         description: Certification files uploaded successfully
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
 *                   example: "Certification files uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     certifications:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                           example: ["https://bucket.s3.region.amazonaws.com/temp/images/coaching/employee/uuid.pdf"]
 *                         count:
 *                           type: number
 *                           example: 2
 *                         type:
 *                           type: string
 *                           example: "certification"
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,
  uploadCertification,
  mediaController.uploadCertifications
);

export default router;

