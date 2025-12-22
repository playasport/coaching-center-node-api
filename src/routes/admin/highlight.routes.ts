import { Router } from 'express';
import * as adminHighlightController from '../../controllers/admin/highlight.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  uploadHighlightVideo,
  uploadHighlightThumbnail,
  uploadHighlightPreview,
  uploadHighlightMedia,
} from '../../middleware/highlightUpload.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/highlights/upload-video:
 *   post:
 *     summary: Upload video for highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     description: Upload a video file for highlight. Requires highlight:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file (MP4, MPEG, MOV, AVI, WebM, MKV). Max size 100MB.
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid file or file size exceeded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/upload-video',
  requirePermission(Section.HIGHLIGHT, Action.CREATE),
  uploadHighlightVideo,
  adminHighlightController.uploadHighlightVideo
);

/**
 * @swagger
 * /admin/highlights/upload-thumbnail:
 *   post:
 *     summary: Upload thumbnail for highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     description: Upload a thumbnail image for highlight. Requires highlight:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - thumbnail
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image (JPEG, PNG, WebP). Max size 5MB.
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 */
router.post(
  '/upload-thumbnail',
  requirePermission(Section.HIGHLIGHT, Action.CREATE),
  uploadHighlightThumbnail,
  adminHighlightController.uploadHighlightThumbnail
);

/**
 * @swagger
 * /admin/highlights/upload-media:
 *   post:
 *     summary: Upload both video and thumbnail for highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     description: Upload both video and thumbnail in a single request. Requires highlight:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file (required). Max size 100MB.
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image (optional). Max size 5MB.
 *     responses:
 *       200:
 *         description: Media files uploaded successfully
 */
router.post(
  '/upload-media',
  requirePermission(Section.HIGHLIGHT, Action.CREATE),
  uploadHighlightMedia,
  adminHighlightController.uploadHighlightMedia
);

/**
 * @swagger
 * /admin/highlights:
 *   get:
 *     summary: Get all highlights for admin
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, archived, blocked, deleted]
 *         description: Filter by highlight status
 *       - in: query
 *         name: videoProcessingStatus
 *         schema:
 *           type: string
 *           enum: [not_started, processing, completed, failed]
 *         description: Filter by video processing status
 *       - in: query
 *         name: coachingCenterId
 *         schema:
 *           type: string
 *         description: Filter by coaching center ID (ObjectId)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (ObjectId)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved highlights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlights:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StreamHighlight'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                   example: "Highlights retrieved successfully"
 *   post:
 *     summary: Create new highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, videoUrl, userId]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 60
 *                 example: "Rajib Soccer Academy Highlights"
 *                 description: "Title of the highlight (max 60 characters)"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Rajib Soccer Academy is committed to developing young football talent through structured coaching, fitness training, and match exposure."
 *                 description: "Description of the highlight"
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://bucket.s3.region.amazonaws.com/highlights/video.mp4"
 *                 description: "S3 URL of the uploaded video"
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: "https://bucket.s3.region.amazonaws.com/highlights/thumbnail.jpg"
 *                 description: "S3 URL of thumbnail (optional - will be auto-generated if not provided)"
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: "User ID (MongoDB ObjectId) who created the highlight"
 *               coachingCenterId:
 *                 type: string
 *                 nullable: true
 *                 example: "507f1f77bcf86cd799439012"
 *                 description: "Coaching center ID (MongoDB ObjectId, optional)"
 *               duration:
 *                 type: number
 *                 example: 3600
 *                 description: "Duration in seconds (optional)"
 *               metadata:
 *                 type: object
 *                 nullable: true
 *                 description: "Additional metadata (optional)"
 *             example:
 *               title: "Rajib Soccer Academy Highlights"
 *               description: "Rajib Soccer Academy is committed to developing young football talent through structured coaching, fitness training, and match exposure."
 *               videoUrl: "https://bucket.s3.region.amazonaws.com/highlights/video.mp4"
 *               thumbnailUrl: "https://bucket.s3.region.amazonaws.com/highlights/thumbnail.jpg"
 *               userId: "507f1f77bcf86cd799439011"
 *               coachingCenterId: "507f1f77bcf86cd799439012"
 *               duration: 3600
 *     responses:
 *       201:
 *         description: Highlight created successfully. Video processing will start automatically in background.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Highlight created successfully"
 *             example:
 *               success: true
 *               data:
 *                 highlight:
 *                   id: "a9e7fb78-085a-4cbc-993c-9784f8f6576a"
 *                   title: "Rajib Soccer Academy Highlights"
 *                   description: "Rajib Soccer Academy is committed to developing young football talent..."
 *                   videoUrl: "https://bucket.s3.region.amazonaws.com/highlights/video.mp4"
 *                   thumbnailUrl: "https://bucket.s3.region.amazonaws.com/highlights/thumbnail.jpg"
 *                   userId: "507f1f77bcf86cd799439011"
 *                   coachingCenterId: "507f1f77bcf86cd799439012"
 *                   status: "published"
 *                   videoProcessingStatus: "not_started"
 *                   duration: 3600
 *                   viewsCount: 0
 *                   likesCount: 0
 *                   commentsCount: 0
 *                   createdAt: "2024-01-15T10:00:00.000Z"
 *                   updatedAt: "2024-01-15T10:00:00.000Z"
 *               message: "Highlight created successfully"
 */
router.get(
  '/',
  requirePermission(Section.HIGHLIGHT, Action.VIEW),
  adminHighlightController.getAllHighlights
);

router.post(
  '/',
  requirePermission(Section.HIGHLIGHT, Action.CREATE),
  adminHighlightController.createHighlight
);

/**
 * @swagger
 * /admin/highlights/{id}:
 *   get:
 *     summary: Get highlight by ID
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved highlight
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Highlight retrieved successfully"
 *   patch:
 *     summary: Update highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [published, archived, blocked, deleted]
 *                 example: "published"
 *                 description: "Highlight status (processing status removed - use videoProcessingStatus for processing state)"
 *               duration:
 *                 type: number
 *                 example: 3600
 *                 description: "Duration in seconds (optional - will be auto-extracted from video during processing)"
 *               metadata:
 *                 type: object
 *                 nullable: true
 *                 description: "Additional metadata"
 *             example:
 *               title: "Updated Highlight Title"
 *               description: "Updated description"
 *               videoUrl: "https://bucket.s3.region.amazonaws.com/highlights/new-video.mp4"
 *               thumbnailUrl: "https://bucket.s3.region.amazonaws.com/highlights/new-thumbnail.jpg"
 *               status: "published"
 *               duration: 4200
 *     responses:
 *       200:
 *         description: Highlight updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Highlight updated successfully"
 *   delete:
 *     summary: Delete highlight (soft delete)
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Highlight deleted successfully
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
 *                   example: "Highlight deleted successfully"
 */
router.get(
  '/:id',
  requirePermission(Section.HIGHLIGHT, Action.VIEW),
  adminHighlightController.getHighlightById
);

router.patch(
  '/:id',
  requirePermission(Section.HIGHLIGHT, Action.UPDATE),
  adminHighlightController.updateHighlight
);

router.delete(
  '/:id',
  requirePermission(Section.HIGHLIGHT, Action.DELETE),
  adminHighlightController.deleteHighlight
);

/**
 * @swagger
 * /admin/highlights/{id}/status:
 *   patch:
 *     summary: Update highlight status
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [published, archived, blocked, deleted]
 *                 example: "published"
 *                 description: "Highlight status (processing status removed - use videoProcessingStatus for processing state)"
 *             example:
 *               status: "published"
 *     responses:
 *       200:
 *         description: Highlight status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Highlight status updated successfully"
 */
router.patch(
  '/:id/status',
  requirePermission(Section.HIGHLIGHT, Action.UPDATE),
  adminHighlightController.updateHighlightStatus
);

/**
 * @swagger
 * /admin/highlights/{id}/process-video:
 *   post:
 *     summary: Reprocess video for a highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     description: Manually trigger video processing for a highlight. This will process the video again regardless of current processing status. Works for both processed and unprocessed videos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "a9e7fb78-085a-4cbc-993c-9784f8f6576a"
 *           description: "Highlight ID"
 *     responses:
 *       200:
 *         description: Video processing job queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Video processing job has been queued. The video will be reprocessed in the background."
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Video processing job has been queued. The video will be reprocessed in the background."
 *       400:
 *         description: Bad request (e.g., highlight has no video URL)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Highlight does not have a video URL to process"
 *       404:
 *         description: Highlight not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Highlight not found"
 */
router.post(
  '/:id/process-video',
  requirePermission(Section.HIGHLIGHT, Action.UPDATE),
  adminHighlightController.reprocessHighlightVideo
);

/**
 * @swagger
 * /admin/highlights/{id}/upload-preview:
 *   post:
 *     summary: Upload preview video for a highlight
 *     tags: [Admin Highlights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Highlight ID (ObjectId)"
 *     description: Upload a preview video file for a specific highlight. Requires highlight:update permission.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - preview
 *             properties:
 *               preview:
 *                 type: string
 *                 format: binary
 *                 description: Preview video file (MP4, MPEG, MOV, AVI, WebM, MKV). Max size 100MB.
 *     responses:
 *       200:
 *         description: Preview video uploaded and updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     previewUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://bucket.s3.region.amazonaws.com/highlights/preview.mp4"
 *                       description: "S3 URL of the uploaded preview video"
 *                     highlight:
 *                       $ref: '#/components/schemas/StreamHighlight'
 *                 message:
 *                   type: string
 *                   example: "Preview video uploaded and updated successfully"
 *             example:
 *               success: true
 *               data:
 *                 previewUrl: "https://bucket.s3.region.amazonaws.com/highlights/preview.mp4"
 *                 highlight:
 *                   id: "a9e7fb78-085a-4cbc-993c-9784f8f6576a"
 *                   title: "Rajib Soccer Academy Highlights"
 *                   previewUrl: "https://bucket.s3.region.amazonaws.com/highlights/preview.mp4"
 *       400:
 *         description: Invalid file or file size exceeded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Highlight not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/upload-preview',
  requirePermission(Section.HIGHLIGHT, Action.UPDATE),
  uploadHighlightPreview,
  adminHighlightController.uploadHighlightPreview
);

export default router;

