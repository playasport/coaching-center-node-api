"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminReelController = __importStar(require("../../controllers/admin/reel.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const highlightUpload_middleware_1 = require("../../middleware/highlightUpload.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
/**
 * @swagger
 * /admin/reels/upload-video:
 *   post:
 *     summary: Upload video for reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     description: Upload a video file for reel. Video duration is validated during upload (max 90 seconds). Requires reel:create permission.
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
router.post('/upload-video', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.CREATE), highlightUpload_middleware_1.uploadHighlightVideo, adminReelController.uploadReelVideo);
/**
 * @swagger
 * /admin/reels/upload-thumbnail:
 *   post:
 *     summary: Upload thumbnail for reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     description: Upload a thumbnail image for reel. Requires reel:create permission.
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
router.post('/upload-thumbnail', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.CREATE), highlightUpload_middleware_1.uploadHighlightThumbnail, adminReelController.uploadReelThumbnail);
/**
 * @swagger
 * /admin/reels/upload-media:
 *   post:
 *     summary: Upload both video and thumbnail for reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     description: Upload both video and thumbnail in a single request. Video duration is validated during upload (max 90 seconds). Requires reel:create permission.
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
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image (JPEG, PNG, WebP). Max size 5MB. Optional.
 *     responses:
 *       200:
 *         description: Media files uploaded successfully
 */
router.post('/upload-media', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.CREATE), highlightUpload_middleware_1.uploadHighlightMedia, adminReelController.uploadReelMedia);
/**
 * @swagger
 * /admin/reels:
 *   get:
 *     summary: Get all reels
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [approved, rejected, blocked, pending]
 *         description: Filter by status
 *       - in: query
 *         name: videoProcessingStatus
 *         schema:
 *           type: string
 *           enum: [not_started, processing, completed, failed]
 *         description: Filter by video processing status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter by sport ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved reels
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
 *                     reels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reel'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                   example: "Reels retrieved successfully"
 *   post:
 *     summary: Create new reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, originalPath, userId]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 60
 *                 example: "Amazing Football Reel"
 *                 description: "Title of the reel (max 60 characters)"
 *               description:
 *                 type: string
 *                 maxLength: 300
 *                 nullable: true
 *                 example: "Check out this amazing football moment!"
 *                 description: "Description of the reel (max 300 characters)"
 *               originalPath:
 *                 type: string
 *                 format: uri
 *                 example: "https://bucket.s3.region.amazonaws.com/reels/video.mp4"
 *                 description: "S3 URL of the uploaded video (max 90 seconds duration)"
 *               thumbnailPath:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: "https://bucket.s3.region.amazonaws.com/reels/thumbnail.jpg"
 *                 description: "S3 URL of thumbnail (optional - will be auto-generated if not provided)"
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: "User ID (MongoDB ObjectId) who created the reel"
 *               sportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["sport-uuid-1", "sport-uuid-2"]
 *                 description: "Array of sport UUIDs (optional)"
 *             example:
 *               title: "Amazing Football Reel"
 *               description: "Check out this amazing football moment!"
 *               originalPath: "https://bucket.s3.region.amazonaws.com/reels/video.mp4"
 *               thumbnailPath: "https://bucket.s3.region.amazonaws.com/reels/thumbnail.jpg"
 *               userId: "507f1f77bcf86cd799439011"
 *               sportIds: ["sport-uuid-1", "sport-uuid-2"]
 *             notes:
 *               - title: max 60 characters
 *               - description: max 300 characters
 *               - originalPath: video must be 90 seconds or less in duration
 *               - Video duration is validated automatically when creating/updating a reel
 *     responses:
 *       201:
 *         description: Reel created successfully. Video processing will start automatically in background.
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
 *                     reel:
 *                       $ref: '#/components/schemas/Reel'
 *                 message:
 *                   type: string
 *                   example: "Reel created successfully"
 */
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.VIEW), adminReelController.getAllReels);
router.post('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.CREATE), adminReelController.createReel);
/**
 * @swagger
 * /admin/reels/{id}:
 *   get:
 *     summary: Get reel by ID
 *     tags: [Admin Reels]
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
 *         description: Successfully retrieved reel
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
 *                     reel:
 *                       $ref: '#/components/schemas/Reel'
 *                 message:
 *                   type: string
 *                   example: "Reel retrieved successfully"
 *   patch:
 *     summary: Update reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update a reel. All fields are optional.
 *
 *       **File Management:**
 *       - If `originalPath` or `thumbnailPath` is in temp folder, it will be automatically moved to permanent location
 *       - Old video/thumbnail files will be deleted from S3 when URLs are changed
 *       - Permanent paths: `reels/{id}/{id}.mp4` and `reels/{id}/thumbnail.{ext}`
 *
 *       **Video Processing:**
 *       - If `originalPath` changes, video will be reprocessed in background
 *       - Video duration will be validated (max 90 seconds)
 *       - Video processing status will be reset to `not_started` and then `processing`
 *
 *       **User:**
 *       - `userId` can be updated
 *       - Must be a valid MongoDB ObjectId (24 hex characters)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reel ID (supports both UUID format and MongoDB ObjectId format for backward compatibility)
 *         examples:
 *           uuid:
 *             value: "42b385a4-ee2d-4d5e-af65-7884afd59645"
 *             summary: UUID format
 *           objectId:
 *             value: "6949205a65bcf6c22e4a7984"
 *             summary: MongoDB ObjectId format
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 60
 *                 description: "Title (max 60 characters)"
 *               description:
 *                 type: string
 *                 maxLength: 300
 *                 nullable: true
 *                 description: "Description (max 300 characters)"
 *               originalPath:
 *                 type: string
 *                 format: uri
 *                 description: "Video URL. If URL is in temp folder, it will be moved to permanent location. Old video will be deleted if URL changes. Video duration will be validated (max 90 seconds)."
 *               thumbnailPath:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 description: "Thumbnail URL. If URL is in temp folder, it will be moved to permanent location. Old thumbnail will be deleted if URL changes."
 *               userId:
 *                 type: string
 *                 description: "User ID (MongoDB ObjectId). Updates the user associated with the reel."
 *                 example: "507f1f77bcf86cd799439011"
 *                 format: uri
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, blocked, pending]
 *               sportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Reel updated successfully
 *       404:
 *         description: Reel not found
 *   delete:
 *     summary: Delete reel
 *     tags: [Admin Reels]
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
 *         description: Reel deleted successfully
 *       404:
 *         description: Reel not found
 */
router.get('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.VIEW), adminReelController.getReelById);
router.patch('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.UPDATE), adminReelController.updateReel);
router.delete('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.DELETE), adminReelController.deleteReel);
/**
 * @swagger
 * /admin/reels/{id}/status:
 *   patch:
 *     summary: Update reel status
 *     tags: [Admin Reels]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, blocked, pending]
 *                 example: "approved"
 *     responses:
 *       200:
 *         description: Reel status updated successfully
 *       404:
 *         description: Reel not found
 */
router.patch('/:id/status', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.UPDATE), adminReelController.updateReelStatus);
/**
 * @swagger
 * /admin/reels/{id}/process-video:
 *   post:
 *     summary: Manually trigger video processing for a reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Reel ID"
 *     responses:
 *       200:
 *         description: Video processing job has been queued.
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
 *                     reel:
 *                       $ref: '#/components/schemas/Reel'
 *                 message:
 *                   type: string
 *                   example: "Video processing job has been queued. The video will be reprocessed in the background."
 *       400:
 *         description: Reel does not have a video URL to process.
 *       404:
 *         description: Reel not found.
 *       500:
 *         description: Failed to enqueue video processing job.
 */
router.post('/:id/process-video', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.UPDATE), adminReelController.reprocessReelVideo);
/**
 * @swagger
 * /admin/reels/{id}/upload-preview:
 *   post:
 *     summary: Upload preview video for a reel
 *     tags: [Admin Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Reel ID"
 *     description: Upload a preview video file for a specific reel. Requires reel:update permission.
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
 *                       example: "https://bucket.s3.region.amazonaws.com/reels/preview.mp4"
 *                       description: "S3 URL of the uploaded preview video"
 *                     reel:
 *                       $ref: '#/components/schemas/Reel'
 *                 message:
 *                   type: string
 *                   example: "Preview video uploaded and updated successfully"
 *       400:
 *         description: Invalid file or file size exceeded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reel not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/upload-preview', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.REEL, section_enum_2.Action.UPDATE), highlightUpload_middleware_1.uploadHighlightPreview, adminReelController.uploadReelPreview);
exports.default = router;
//# sourceMappingURL=reel.routes.js.map