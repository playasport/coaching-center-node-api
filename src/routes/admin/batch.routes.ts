import { Router } from 'express';
import * as batchController from '../../controllers/admin/batch.controller';
import { validate } from '../../middleware/validation.middleware';
import { batchCreateSchema, batchUpdateSchema } from '../../validations/batch.validation';
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
 *   post:
 *     summary: Create a new batch (admin)
 *     description: Create a new batch for any coaching center. The userId is automatically extracted from the center. Requires batch:create permission. Fee configurations have been removed - use base_price and discounted_price instead.
 *     tags: [Admin Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sportId
 *               - centerId
 *               - gender
 *               - certificate_issued
 *               - scheduled
 *               - duration
 *               - capacity
 *               - age
 *               - base_price
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Morning Batch"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 example: "Early morning training session for beginners"
 *               sportId:
 *                 type: string
 *                 description: Sport ObjectId (must be available for the selected center)
 *                 example: "507f1f77bcf86cd799439011"
 *               centerId:
 *                 type: string
 *                 description: Coaching Center ObjectId or custom ID (UUID). The userId will be automatically extracted from the center.
 *                 example: "507f1f77bcf86cd799439011"
 *               coach:
 *                 type: string
 *                 nullable: true
 *                 description: Employee ObjectId (optional)
 *                 example: "507f1f77bcf86cd799439012"
 *               gender:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [male, female, others]
 *                 minItems: 1
 *                 description: At least one gender must be selected
 *                 example: ["male", "female"]
 *               certificate_issued:
 *                 type: boolean
 *                 description: Whether a certificate will be issued upon completion
 *                 example: true
 *               scheduled:
 *                 type: object
 *                 required:
 *                   - start_date
 *                   - training_days
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     description: Must be today or a future date (YYYY-MM-DD)
 *                     example: "2024-12-01"
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                     description: Optional end date. Should match calculated end date based on duration (±1 day tolerance)
 *                     example: "2024-12-31"
 *                   start_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
 *                     description: Required for common timing (HH:mm format)
 *                     example: "09:00"
 *                   end_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
 *                     description: Required for common timing (HH:mm format)
 *                     example: "11:00"
 *                   individual_timings:
 *                     type: array
 *                     nullable: true
 *                     description: Required for individual timing (different time for each day)
 *                     items:
 *                       type: object
 *                       required:
 *                         - day
 *                         - start_time
 *                         - end_time
 *                       properties:
 *                         day:
 *                           type: string
 *                           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                           example: "monday"
 *                         start_time:
 *                           type: string
 *                           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                           example: "09:00"
 *                         end_time:
 *                           type: string
 *                           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                           example: "11:00"
 *                   training_days:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     minItems: 1
 *                     description: If duration.type is "day", must select exactly duration.count days
 *                     example: ["monday", "wednesday", "friday"]
 *               duration:
 *                 type: object
 *                 required:
 *                   - count
 *                   - type
 *                 properties:
 *                   count:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                     description: Must be a positive integer
 *                     example: 3
 *                   type:
 *                     type: string
 *                     enum: [day, month, week, year]
 *                     default: month
 *                     example: "month"
 *               capacity:
 *                 type: object
 *                 required:
 *                   - min
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                     example: 10
 *                   max:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                     nullable: true
 *                     description: Must be >= min if provided
 *                     example: 30
 *               age:
 *                 type: object
 *                 required:
 *                   - min
 *                   - max
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *                     description: Must respect center's age range if available
 *                     example: 8
 *                   max:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *                     description: Must be >= min and respect center's age range if available
 *                     example: 12
 *               admission_fee:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 nullable: true
 *                 description: One-time admission fee (max ₹1 crore)
 *                 example: 500
 *               base_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 description: Base price for the batch (max ₹1 crore)
 *                 example: 5000
 *               discounted_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 nullable: true
 *                 description: Discounted price (must be <= base_price, max ₹1 crore)
 *                 example: 4500
 *               status:
 *                 type: string
 *                 enum: [published, draft]
 *                 default: draft
 *                 description: Initial status of the batch (only for new batches)
 *                 example: "draft"
 *           examples:
 *             commonTiming:
 *               summary: Batch with common timing
 *               value:
 *                 name: "Morning Yoga Batch"
 *                 description: "Early morning yoga sessions for all levels"
 *                 sportId: "507f1f77bcf86cd799439011"
 *                 centerId: "507f1f77bcf86cd799439011"
 *                 coach: "507f1f77bcf86cd799439012"
 *                 gender: ["male", "female"]
 *                 certificate_issued: true
 *                 scheduled:
 *                   start_date: "2024-04-01"
 *                   end_date: "2024-06-30"
 *                   start_time: "07:00"
 *                   end_time: "08:30"
 *                   training_days: ["monday", "wednesday", "friday"]
 *                 duration:
 *                   count: 3
 *                   type: "month"
 *                 capacity:
 *                   min: 10
 *                   max: 25
 *                 age:
 *                   min: 12
 *                   max: 18
 *                 admission_fee: 500
 *                 base_price: 3000
 *                 discounted_price: 2500
 *                 status: "published"
 *             individualTiming:
 *               summary: Batch with individual timing (different time for each day)
 *               value:
 *                 name: "Flexible Training Batch"
 *                 description: "Training with different timings for each day"
 *                 sportId: "507f1f77bcf86cd799439011"
 *                 centerId: "507f1f77bcf86cd799439011"
 *                 gender: ["male", "female"]
 *                 certificate_issued: false
 *                 scheduled:
 *                   start_date: "2024-04-01"
 *                   individual_timings:
 *                     - day: "monday"
 *                       start_time: "09:00"
 *                       end_time: "11:00"
 *                     - day: "wednesday"
 *                       start_time: "14:00"
 *                       end_time: "16:00"
 *                     - day: "friday"
 *                       start_time: "17:00"
 *                       end_time: "19:00"
 *                   training_days: ["monday", "wednesday", "friday"]
 *                 duration:
 *                   count: 2
 *                   type: "month"
 *                 capacity:
 *                   min: 15
 *                   max: 30
 *                 age:
 *                   min: 10
 *                   max: 16
 *                 base_price: 5000
 *                 status: "draft"
 *             dayBasedDuration:
 *               summary: Batch with day-based duration (must select exactly duration.count days)
 *               value:
 *                 name: "Weekend Special"
 *                 description: "2-day weekend training program"
 *                 sportId: "507f1f77bcf86cd799439011"
 *                 centerId: "507f1f77bcf86cd799439011"
 *                 gender: ["male", "female", "others"]
 *                 certificate_issued: true
 *                 scheduled:
 *                   start_date: "2024-04-06"
 *                   start_time: "10:00"
 *                   end_time: "12:00"
 *                   training_days: ["saturday", "sunday"]
 *                 duration:
 *                   count: 2
 *                   type: "day"
 *                 capacity:
 *                   min: 8
 *                   max: 16
 *                 age:
 *                   min: 8
 *                   max: 14
 *                 base_price: 2000
 *                 status: "published"
 *     responses:
 *       201:
 *         description: Batch created successfully
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
 *                   example: "Batch created successfully"
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
 *         description: Sport, center, or coach not found
 */
router.post(
  '/',
  requirePermission(Section.BATCH, Action.CREATE),
  validate(batchCreateSchema),
  batchController.createBatch
);

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
 *           enum: [published, draft]
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
 *     description: Update a batch. All fields are optional. **Important:** If batch is active (is_active = true), details cannot be updated. You must first set is_active to false, then update other details. **Status restriction:** If current status is "published", it cannot be changed to "draft". Fee configurations have been removed - use base_price and discounted_price instead. Requires batch:update permission.
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
 *                 maxLength: 50
 *                 example: "Updated Morning Batch"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 example: "Updated description"
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
 *               gender:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [male, female, others]
 *                 minItems: 1
 *                 example: ["male", "female"]
 *               certificate_issued:
 *                 type: boolean
 *                 example: true
 *               scheduled:
 *                 type: object
 *                 description: If provided, must include all required fields
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     example: "2024-12-01"
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                     example: "2024-12-31"
 *                   start_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
 *                     example: "09:00"
 *                   end_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
 *                     example: "11:00"
 *                   individual_timings:
 *                     type: array
 *                     nullable: true
 *                     items:
 *                       type: object
 *                       properties:
 *                         day:
 *                           type: string
 *                           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                         start_time:
 *                           type: string
 *                           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                         end_time:
 *                           type: string
 *                           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
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
 *                     maximum: 1000
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
 *                     maximum: 1000
 *                     example: 10
 *                   max:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
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
 *                 maximum: 10000000
 *                 nullable: true
 *                 example: 500
 *               base_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 example: 5000
 *               discounted_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 nullable: true
 *                 description: Must be <= base_price
 *                 example: 4500
 *               status:
 *                 type: string
 *                 enum: [published, draft]
 *                 description: Cannot change from "published" to "draft"
 *                 example: "draft"
 *               is_active:
 *                 type: boolean
 *                 description: If true, batch details cannot be updated. Must set to false first before updating other fields.
 *                 example: false
 *           examples:
 *             simpleUpdate:
 *               summary: Simple update (name and prices only)
 *               value:
 *                 name: "Updated Batch Name"
 *                 base_price: 5500
 *                 discounted_price: 5000
 *             completeUpdate:
 *               summary: Complete update with all fields
 *               value:
 *                 name: "Updated Morning Batch"
 *                 description: "Updated description"
 *                 sportId: "507f1f77bcf86cd799439011"
 *                 centerId: "507f1f77bcf86cd799439011"
 *                 coach: "507f1f77bcf86cd799439012"
 *                 gender: ["male", "female", "others"]
 *                 certificate_issued: true
 *                 scheduled:
 *                   start_date: "2024-12-01"
 *                   end_date: "2024-12-31"
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
 *                 admission_fee: 500
 *                 base_price: 5000
 *                 discounted_price: 4500
 *             individualTimingUpdate:
 *               summary: Update with individual timing
 *               value:
 *                 scheduled:
 *                   start_date: "2024-12-01"
 *                   individual_timings:
 *                     - day: "monday"
 *                       start_time: "09:00"
 *                       end_time: "11:00"
 *                     - day: "wednesday"
 *                       start_time: "14:00"
 *                       end_time: "16:00"
 *                   training_days: ["monday", "wednesday"]
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
 *         description: Validation error or invalid data. Possible errors: "Cannot update batch details while batch is active", "Cannot change status from 'published' to 'draft'"
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
