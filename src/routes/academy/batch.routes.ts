import { Router } from 'express';
import * as batchController from '../../controllers/academy/batch.controller';
import { validate } from '../../middleware/validation.middleware';
import { batchCreateSchema, batchUpdateSchema } from '../../validations/batch.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/batch:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batch]
 *     description: Create a new batch. Fee configurations have been removed - use base_price and discounted_price instead. Requires authentication.
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
 *                 example: "Early morning training session"
 *               sportId:
 *                 type: string
 *                 description: Sport ObjectId (must be available for selected center)
 *               centerId:
 *                 type: string
 *                 description: Coaching Center ObjectId
 *               coach:
 *                 type: string
 *                 nullable: true
 *                 description: Employee ObjectId (optional)
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
 *                 required:
 *                   - start_date
 *                   - training_days
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     example: "2024-04-01"
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                     example: "2024-06-30"
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
 *                 required:
 *                   - count
 *                   - type
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
 *               is_allowed_disabled:
 *                 type: boolean
 *                 default: false
 *                 description: Whether disabled participants are allowed in this batch
 *                 example: false
 *               status:
 *                 type: string
 *                 enum: [published, draft]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Batch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchResponse'
 *       400:
 *         description: Validation error or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Sport, center, or coach not found
 */
router.post(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(batchCreateSchema),
  batchController.createBatch
);

/**
 * @swagger
 * /academy/batch/my/list:
 *   get:
 *     summary: Get list of batches for logged-in user
 *     tags: [Batch]
 *     description: Retrieve a paginated list of batches belonging to the authenticated user. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchListResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get(
  '/my/list',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  batchController.getMyBatches
);

/**
 * @swagger
 * /academy/batch/center/{centerId}:
 *   get:
 *     summary: Get list of batches for a specific center
 *     tags: [Batch]
 *     description: Retrieve a paginated list of batches for a specific coaching center. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching Center ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchListResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required or center does not belong to user
 *       404:
 *         description: Center not found
 */
router.get(
  '/center/:centerId',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  batchController.getBatchesByCenter
);

/**
 * @swagger
 * /academy/batch/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batch]
 *     description: Retrieve a batch by its ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Batch not found
 */
router.get('/:id', authenticate, authorize(DefaultRoles.ACADEMY), batchController.getBatch);

/**
 * @swagger
 * /academy/batch/{id}:
 *   patch:
 *     summary: Update batch details
 *     tags: [Batch]
 *     description: Update batch details. All fields are optional. **Important:** If batch is active (is_active = true), details cannot be updated. You must first set is_active to false, then update other details. **Status restriction:** If current status is "published", it cannot be changed to "draft". Fee configurations have been removed - use base_price and discounted_price instead. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
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
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               sportId:
 *                 type: string
 *               centerId:
 *                 type: string
 *               coach:
 *                 type: string
 *                 nullable: true
 *               gender:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [male, female, others]
 *                 minItems: 1
 *               certificate_issued:
 *                 type: boolean
 *               scheduled:
 *                 type: object
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                   start_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
 *                   end_time:
 *                     type: string
 *                     pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                     nullable: true
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
 *               duration:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                   type:
 *                     type: string
 *                     enum: [day, month, week, year]
 *               capacity:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                   max:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                     nullable: true
 *               age:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *                   max:
 *                     type: number
 *                     minimum: 3
 *                     maximum: 18
 *               admission_fee:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 nullable: true
 *               base_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *               discounted_price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000000
 *                 nullable: true
 *                 description: Must be <= base_price
 *               status:
 *                 type: string
 *                 enum: [published, draft]
 *                 description: Cannot change from "published" to "draft"
 *               is_active:
 *                 type: boolean
 *                 description: If true, batch details cannot be updated. Must set to false first before updating other fields.
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       400:
 *         description: Validation error or invalid data. Possible errors: "Cannot update batch details while batch is active", "Cannot change status from 'published' to 'draft'"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Can only update own batches
 *       404:
 *         description: Batch not found
 */
router.patch(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(batchUpdateSchema),
  batchController.updateBatch
);

/**
 * @swagger
 * /academy/batch/{id}/toggle-status:
 *   patch:
 *     summary: Toggle batch active status
 *     tags: [Batch]
 *     description: Toggle batch active/inactive status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch status toggled successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Can only toggle own batches
 *       404:
 *         description: Batch not found
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  batchController.toggleBatchStatus
);

/**
 * @swagger
 * /academy/batch/{id}:
 *   delete:
 *     summary: Delete batch (soft delete)
 *     tags: [Batch]
 *     description: Soft delete a batch by setting is_deleted to true. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Can only delete own batches
 *       404:
 *         description: Batch not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  batchController.deleteBatch
);

export default router;

