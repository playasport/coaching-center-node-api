import { Router } from 'express';
import * as highlightController from '../controllers/highlight.controller';

const router = Router();

/**
 * @swagger
 * /highlights:
 *   get:
 *     summary: Get paginated list of highlights
 *     tags: [Highlights]
 *     description: Retrieve a paginated list of published highlights with minimal data
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
 *           maximum: 100
 *         description: Number of highlights per page (max 100)
 *     responses:
 *       200:
 *         description: Highlights retrieved successfully
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
 *                   example: "Highlights retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     highlights:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "3312582084045221342003"
 *                           thumbnail:
 *                             type: string
 *                             format: uri
 *                             example: "https://media-playsport.s3.ap-south-1.amazonaws.com/live_stream_recordings/3312582084045221342003/3312582084045221342003.jpg"
 *                           title:
 *                             type: string
 *                             example: "Fit City Kids: Winter Fun, Less Screen Time!"
 *                           viewers:
 *                             type: integer
 *                             example: 600
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     total_pages:
 *                       type: integer
 *                       example: 5
 *                     limit:
 *                       type: integer
 *                       example: 10
 */
router.get('/highlights', highlightController.getHighlightsList);

/**
 * @swagger
 * /highlights/{id}:
 *   get:
 *     summary: Get highlight details by ID
 *     tags: [Highlights]
 *     description: Retrieve detailed information about a specific highlight including user, sports, and coaching center data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Highlight ID
 *     responses:
 *       200:
 *         description: Highlight retrieved successfully
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
 *                   example: "Highlight retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "3312582084045221342003"
 *                     title:
 *                       type: string
 *                       example: "Fit City Kids: Winter Fun, Less Screen Time!"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "A fun winter activity session for kids"
 *                     thumbnail:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://media-playsport.s3.ap-south-1.amazonaws.com/live_stream_recordings/3312582084045221342003/3312582084045221342003.jpg"
 *                     playLink:
 *                       type: string
 *                       format: uri
 *                       example: "https://media-playsport.s3.ap-south-1.amazonaws.com/highlights/3312582084045221342003/master.m3u8"
 *                     views:
 *                       type: integer
 *                       example: 600
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:00:00.000Z"
 *                     user:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         logo:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: "https://media-playsport.s3.ap-south-1.amazonaws.com/users/profile_photo/avatar.jpg"
 *                     sports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "sport-uuid-123"
 *                           name:
 *                             type: string
 *                             example: "Football"
 *                           logo:
 *                             type: string
 *                             format: uri
 *                             nullable: true
 *                             example: "https://media-playsport.s3.ap-south-1.amazonaws.com/sports/football.png"
 *                     coachingCenter:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "coaching-center-uuid-123"
 *                         name:
 *                           type: string
 *                           example: "Fit City Kids Academy"
 *                         logo:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: "https://media-playsport.s3.ap-south-1.amazonaws.com/coaching-centers/logo.jpg"
 *       404:
 *         description: Highlight not found
 */
router.get('/highlights/:id', highlightController.getHighlightById);

/**
 * @swagger
 * /highlights/{id}/view:
 *   put:
 *     summary: Update highlight view count
 *     tags: [Highlights]
 *     description: Increment the view count for a specific highlight
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Highlight ID
 *     responses:
 *       200:
 *         description: Highlight view updated successfully
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
 *                   example: "Highlight view updated successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
router.put('/highlights/:id/view', highlightController.updateHighlightView);

export default router;
