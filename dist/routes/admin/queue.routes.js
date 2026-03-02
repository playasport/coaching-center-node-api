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
const queueController = __importStar(require("../../controllers/admin/queue.controller"));
const logController = __importStar(require("../../controllers/admin/log.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
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
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), // Using SETTINGS as queue management is a system setting
queueController.getAllQueues);
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
 *           enum: [thumbnail-generation, video-processing-reel, media-move-coaching-center]
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
 *         description: Queue jobs retrieved successfully. Each job has progress (raw) and progressPercent (0-100) for progress bar; completed jobs have progressPercent 100.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           state: { type: string }
 *                           progress: { description: Raw progress from worker }
 *                           progressPercent: { type: number, description: 0-100 for progress bar display }
 *                     total: { type: number }
 *                     page: { type: number }
 *                     limit: { type: number }
 *                     totalPages: { type: number }
 */
router.get('/:queueName/jobs', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), queueController.getQueueJobs);
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
router.get('/:queueName/jobs/:jobId', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), queueController.getQueueJob);
router.delete('/:queueName/jobs/:jobId', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.DELETE), queueController.removeJob);
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
router.post('/:queueName/jobs/:jobId/retry', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.UPDATE), queueController.retryJob);
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
router.post('/:queueName/pause', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.UPDATE), queueController.pauseQueue);
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
router.post('/:queueName/resume', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.UPDATE), queueController.resumeQueue);
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
router.post('/:queueName/clean', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.DELETE), queueController.cleanQueue);
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
router.get('/logs/application', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), logController.getApplicationLogs);
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
router.get('/logs/queue', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), logController.getQueueLogs);
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
router.get('/logs/video-processing', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), logController.getVideoProcessingLogs);
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
router.get('/logs/job/:jobId', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), logController.getLogsByJobId);
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
router.get('/logs/info', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.SETTINGS, section_enum_2.Action.VIEW), logController.getLogFileInfo);
exports.default = router;
//# sourceMappingURL=queue.routes.js.map