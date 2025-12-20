import { Router } from 'express';
import * as batchController from '../../controllers/admin/batch.controller';
import { validate } from '../../middleware/validation.middleware';
import { batchUpdateSchema } from '../../validations/batch.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/batches:
 *   get:
 *     summary: Get all batches (admin)
 *     description: Retrieve paginated list of all batches with filters. Requires batch:view permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by Academy owner ID
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter by Coaching Center ID
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter by Sport ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, draft, inactive]
 *         description: Filter by batch status
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by batch name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by (e.g., createdAt, name)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc for ascending, desc for descending). Defaults to desc (newer first).
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
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
 *                   example: "Batches retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Batch'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  requirePermission(Section.BATCH, Action.VIEW),
  batchController.getAllBatches
);

/**
 * @swagger
 * /admin/batches/user/{userId}:
 *   get:
 *     summary: Get batches by user ID (admin)
 *     description: Retrieve all batches belonging to a specific academy user with pagination. Requires batch:view permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID)
 *         example: "f316a86c-2909-4d32-8983-eb225c715bcb"
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc for ascending, desc for descending). Defaults to desc (newer first).
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
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
 *                   example: "Batches retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Batch'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/user/:userId',
  requirePermission(Section.BATCH, Action.VIEW),
  batchController.getBatchesByUserId
);

/**
 * @swagger
 * /admin/batches/center/{centerId}:
 *   get:
 *     summary: Get batches by center ID (admin)
 *     description: Retrieve all batches for a specific coaching center with pagination. Requires batch:view permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching Center ID
 *         example: "507f1f77bcf86cd799439011"
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc for ascending, desc for descending). Defaults to desc (newer first).
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
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
 *                   example: "Batches retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Batch'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Center not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/center/:centerId',
  requirePermission(Section.BATCH, Action.VIEW),
  batchController.getBatchesByCenterId
);

/**
 * @swagger
 * /admin/batches/{id}:
 *   get:
 *     summary: Get batch by ID (admin)
 *     description: Retrieve a specific batch by ID. Requires batch:view permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Batch retrieved successfully
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
 *                   example: "Batch retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       404:
 *         description: Batch not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/:id',
  requirePermission(Section.BATCH, Action.VIEW),
  batchController.getBatch
);

/**
 * @swagger
 * /admin/batches/{id}:
 *   patch:
 *     summary: Update batch (admin)
 *     description: Update a batch. All fields are optional. Requires batch:update permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Morning Batch"
 *               sportId:
 *                 type: string
 *                 description: Sport ObjectId
 *                 example: "507f1f77bcf86cd799439011"
 *               centerId:
 *                 type: string
 *                 description: Coaching Center ObjectId or custom ID
 *                 example: "507f1f77bcf86cd799439011"
 *               coach:
 *                 type: string
 *                 nullable: true
 *                 description: Employee ObjectId (optional)
 *                 example: "507f1f77bcf86cd799439012"
 *               scheduled:
 *                 type: object
 *                 description: If provided, all fields are required
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     example: "2024-12-01"
 *                   start_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     example: "09:00"
 *                   end_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     example: "11:00"
 *                   training_days:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     minItems: 1
 *                     example: ["monday", "wednesday", "friday"]
 *               duration:
 *                 type: object
 *                 description: If provided, all fields are required
 *                 properties:
 *                   count:
 *                     type: number
 *                     minimum: 1
 *                     example: 3
 *                   type:
 *                     type: string
 *                     enum: [day, month, week, year]
 *                     example: "month"
 *               capacity:
 *                 type: object
 *                 description: If provided, min is required
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 1
 *                     example: 10
 *                   max:
 *                     type: number
 *                     minimum: 1
 *                     nullable: true
 *                     example: 30
 *               age:
 *                 type: object
 *                 description: If provided, all fields are required
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *                     example: 8
 *                   max:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *                     example: 12
 *               admission_fee:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 example: 5000
 *               fee_structure:
 *                 type: object
 *                 nullable: true
 *                 description: If provided, fee_type and fee_configuration are required
 *                 properties:
 *                   fee_type:
 *                     type: string
 *                     enum: [monthly, daily, weekly, hourly, per_batch, per_session, age_based, coach_license_based, player_level_based, seasonal, package_based, group_discount, advance_booking, weekend_pricing, peak_hours, membership_based, custom]
 *                     example: "monthly"
 *                   fee_configuration:
 *                     type: object
 *                     additionalProperties: true
 *                     description: Dynamic configuration based on fee_type
 *                     example:
 *                       base_price: 2000
 *                       classes_per_week_options:
 *                         - days_per_week: 2
 *                           price: 1500
 *                         - days_per_week: 3
 *                           price: 2000
 *                   admission_fee:
 *                     type: number
 *                     minimum: 0
 *                     nullable: true
 *                     example: 5000
 *               status:
 *                 type: string
 *                 enum: [published, draft, inactive]
 *                 example: "published"
 *           examples:
 *             simpleUpdate:
 *               summary: Simple update (name and status only)
 *               value:
 *                 name: "Updated Batch Name"
 *                 status: "published"
 *             completeUpdate:
 *               summary: Complete update with all fields
 *               value:
 *                 name: "Updated Morning Batch"
 *                 sportId: "507f1f77bcf86cd799439011"
 *                 centerId: "507f1f77bcf86cd799439011"
 *                 coach: "507f1f77bcf86cd799439012"
 *                 scheduled:
 *                   start_date: "2024-12-01"
 *                   start_time: "09:00"
 *                   end_time: "11:00"
 *                   training_days: ["monday", "wednesday", "friday"]
 *                 duration:
 *                   count: 3
 *                   type: "month"
 *                 capacity:
 *                   min: 10
 *                   max: 30
 *                 age:
 *                   min: 8
 *                   max: 12
 *                 admission_fee: 5000
 *                 fee_structure:
 *                   fee_type: "monthly"
 *                   fee_configuration:
 *                     base_price: 2000
 *                     classes_per_week_options:
 *                       - days_per_week: 2
 *                         price: 1500
 *                       - days_per_week: 3
 *                         price: 2000
 *                   admission_fee: 5000
 *                 status: "published"
 *     responses:
 *       200:
 *         description: Batch updated successfully
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
 *                   example: "Batch updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Validation error or invalid data
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Batch not found
 */
router.patch(
  '/:id',
  requirePermission(Section.BATCH, Action.UPDATE),
  validate(batchUpdateSchema),
  batchController.updateBatch
);

/**
 * @swagger
 * /admin/batches/{id}/toggle-status:
 *   patch:
 *     summary: Toggle batch status (admin)
 *     description: Activate or deactivate a batch. Requires batch:update permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Status toggled successfully
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
 *                   example: "Batch status toggled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Batch not found
 */
router.patch(
  '/:id/toggle-status',
  requirePermission(Section.BATCH, Action.UPDATE),
  batchController.toggleStatus
);

/**
 * @swagger
 * /admin/batches/{id}:
 *   delete:
 *     summary: Delete batch (admin)
 *     description: Delete a batch (soft delete). Requires batch:delete permission.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Batch deleted successfully
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
 *                   example: "Batch deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Batch not found
 */
router.delete(
  '/:id',
  requirePermission(Section.BATCH, Action.DELETE),
  batchController.deleteBatch
);

export default router;
