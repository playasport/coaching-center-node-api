import { Router } from 'express';
import * as queueController from '../../controllers/admin/queue.controller';
import * as logController from '../../controllers/admin/log.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/queues:
 *   get:
 *     summary: Get all queues with statistics
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     description: Get statistics for all queues (thumbnail generation, video processing). Requires appropriate permission.
 *     responses:
 *       200:
 *         description: Queues retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     queues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           active:
 *                             type: number
 *                           waiting:
 *                             type: number
 *                           completed:
 *                             type: number
 *                           failed:
 *                             type: number
 *                           delayed:
 *                             type: number
 *                           paused:
 *                             type: boolean
 *                     totalQueues:
 *                       type: number
 */
router.get(
  '/',
  requirePermission(Section.SETTINGS, Action.VIEW), // Using SETTINGS as queue management is a system setting
  queueController.getAllQueues
);

/**
 * @swagger
 * /admin/queues/{queueName}/jobs:
 *   get:
 *     summary: Get jobs from a specific queue
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [thumbnail-generation, video-processing-reel]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, waiting, completed, failed, delayed, all]
 *           default: all
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Queue jobs retrieved successfully
 */
router.get(
  '/:queueName/jobs',
  requirePermission(Section.SETTINGS, Action.VIEW),
  queueController.getQueueJobs
);

/**
 * @swagger
 * /admin/queues/{queueName}/jobs/{jobId}:
 *   get:
 *     summary: Get a specific job by ID
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *   delete:
 *     summary: Remove a job from queue
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job removed successfully
 */
router.get(
  '/:queueName/jobs/:jobId',
  requirePermission(Section.SETTINGS, Action.VIEW),
  queueController.getQueueJob
);

router.delete(
  '/:queueName/jobs/:jobId',
  requirePermission(Section.SETTINGS, Action.DELETE),
  queueController.removeJob
);

/**
 * @swagger
 * /admin/queues/{queueName}/jobs/{jobId}/retry:
 *   post:
 *     summary: Retry a failed job
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retried successfully
 */
router.post(
  '/:queueName/jobs/:jobId/retry',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  queueController.retryJob
);

/**
 * @swagger
 * /admin/queues/{queueName}/pause:
 *   post:
 *     summary: Pause a queue
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue paused successfully
 */
router.post(
  '/:queueName/pause',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  queueController.pauseQueue
);

/**
 * @swagger
 * /admin/queues/{queueName}/resume:
 *   post:
 *     summary: Resume a paused queue
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue resumed successfully
 */
router.post(
  '/:queueName/resume',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  queueController.resumeQueue
);

/**
 * @swagger
 * /admin/queues/{queueName}/clean:
 *   post:
 *     summary: Clean a queue (remove completed/failed jobs)
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: grace
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Grace period in milliseconds
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Maximum number of jobs to clean
 *     responses:
 *       200:
 *         description: Queue cleaned successfully
 */
router.post(
  '/:queueName/clean',
  requirePermission(Section.SETTINGS, Action.DELETE),
  queueController.cleanQueue
);

/**
 * @swagger
 * /admin/queues/logs/application:
 *   get:
 *     summary: Get application logs
 *     tags: [Admin Queues]
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
 *           default: 100
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [debug, info, warn, error]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application logs retrieved successfully
 */
router.get(
  '/logs/application',
  requirePermission(Section.SETTINGS, Action.VIEW),
  logController.getApplicationLogs
);

/**
 * @swagger
 * /admin/queues/logs/queue:
 *   get:
 *     summary: Get queue-related logs
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: queueName
 *         schema:
 *           type: string
 *         description: Filter by specific queue name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Queue logs retrieved successfully
 */
router.get(
  '/logs/queue',
  requirePermission(Section.SETTINGS, Action.VIEW),
  logController.getQueueLogs
);

/**
 * @swagger
 * /admin/queues/logs/video-processing:
 *   get:
 *     summary: Get video processing logs
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filter by specific job ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Video processing logs retrieved successfully
 */
router.get(
  '/logs/video-processing',
  requirePermission(Section.SETTINGS, Action.VIEW),
  logController.getVideoProcessingLogs
);

/**
 * @swagger
 * /admin/queues/logs/job/{jobId}:
 *   get:
 *     summary: Get logs by job ID
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Job logs retrieved successfully
 */
router.get(
  '/logs/job/:jobId',
  requirePermission(Section.SETTINGS, Action.VIEW),
  logController.getLogsByJobId
);

/**
 * @swagger
 * /admin/queues/logs/info:
 *   get:
 *     summary: Get log file information
 *     tags: [Admin Queues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log file info retrieved successfully
 */
router.get(
  '/logs/info',
  requirePermission(Section.SETTINGS, Action.VIEW),
  logController.getLogFileInfo
);

export default router;

