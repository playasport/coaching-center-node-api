import { Router } from 'express';
import * as batchController from '../controllers/batch.controller';
import { validate } from '../middleware/validation.middleware';
import { batchCreateSchema, batchUpdateSchema } from '../validations/batch.validation';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { DefaultRoles } from '../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/batch:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batch]
 *     description: Create a new batch. Requires authentication.
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
 *               - scheduled
 *               - duration
 *               - capacity
 *               - age
 *               - fee_structure
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Morning Batch"
 *               sportId:
 *                 type: string
 *                 description: Sport ObjectId
 *               centerId:
 *                 type: string
 *                 description: Coaching Center ObjectId
 *               coach:
 *                 type: string
 *                 description: Employee ObjectId (optional)
 *               scheduled:
 *                 type: object
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   start_time:
 *                     type: string
 *                     example: "09:00"
 *                   end_time:
 *                     type: string
 *                     example: "11:00"
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
 *                     example: 3
 *                   type:
 *                     type: string
 *                     enum: [day, month, week, year]
 *               capacity:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 10
 *                   max:
 *                     type: number
 *                     example: 30
 *               age:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 8
 *                     minimum: 3
 *                     maximum: 18
 *                   max:
 *                     type: number
 *                     example: 12
 *                     minimum: 3
 *                     maximum: 18
 *               admission_fee:
 *                 type: number
 *                 example: 5000
 *               fee_structure:
 *                 type: object
 *                 required:
 *                   - fee_type
 *                   - fee_configuration
 *                 properties:
 *                   fee_type:
 *                     type: string
 *                     enum: [monthly, daily, weekly, hourly, per_batch, per_session, age_based, coach_license_based, player_level_based, seasonal, package_based, group_discount, advance_booking, weekend_pricing, peak_hours, membership_based, custom]
 *                     example: "monthly"
 *                     description: Fee type (see /academy/fee-type-config endpoint for available types)
 *                   fee_configuration:
 *                     type: object
 *                     additionalProperties: true
 *                     description: Dynamic configuration object based on fee_type (see /academy/fee-type-config/:feeType endpoint for form structure)
 *                     example:
 *                       base_price: 2000
 *                       classes_per_week_options:
 *                         - days_per_week: 2
 *                           price: 1500
 *                         - days_per_week: 3
 *                           price: 2000
 *               status:
 *                 type: string
 *                 enum: [published, draft, inactive]
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
 *     description: Update batch details. All fields are optional. Requires authentication.
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
 *               sportId:
 *                 type: string
 *               centerId:
 *                 type: string
 *               coach:
 *                 type: string
 *               scheduled:
 *                 type: object
 *               duration:
 *                 type: object
 *               capacity:
 *                 type: object
 *               age:
 *                 type: object
 *               admission_fee:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [published, draft, inactive]
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       400:
 *         description: Validation error or invalid data
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

