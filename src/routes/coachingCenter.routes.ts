import { Router } from 'express';
import * as coachingCenterController from '../controllers/coachingCenter.controller';
import { validate } from '../middleware/validation.middleware';
import { coachingCenterCreateSchema, coachingCenterUpdateSchema } from '../validations/coachingCenter.validation';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { DefaultRoles } from '../models/role.model';
import coachingCenterMediaRoutes from './coachingCenterMedia.routes';

const router = Router();

/**
 * @swagger
 * /coaching-center:
 *   post:
 *     summary: Create a new coaching center
 *     tags: [Coaching Center]
 *     description: Create a new coaching center. Can be saved as draft or published. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoachingCenterCreateRequest'
 *     responses:
 *       201:
 *         description: Coaching center created successfully
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
 *                   example: "Coaching center created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       409:
 *         description: Email or mobile number already exists
 */
router.post(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(coachingCenterCreateSchema),
  coachingCenterController.createCoachingCenter
);

/**
 * @swagger
 * /coaching-center/{id}:
 *   get:
 *     summary: Get coaching center by ID
 *     tags: [Coaching Center]
 *     description: Retrieve a coaching center by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *     responses:
 *       200:
 *         description: Coaching center retrieved successfully
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
 *                   example: "Coaching center retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       404:
 *         description: Coaching center not found
 */
router.get('/:id', coachingCenterController.getCoachingCenter);

/**
 * @swagger
 * /coaching-center/{id}:
 *   patch:
 *     summary: Update coaching center details
 *     tags: [Coaching Center]
 *     description: Update coaching center details. All fields are optional. If status changes from 'draft' to 'published', media files are automatically moved to permanent locations. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               center_name:
 *                 type: string
 *                 maxLength: 255
 *               mobile_number:
 *                 type: string
 *                 pattern: '^[6-9]\d{9}$'
 *                 description: 10 digits, starting with 6-9
 *               email:
 *                 type: string
 *                 format: email
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               rules_regulation:
 *                 type: string
 *                 maxLength: 5000
 *               logo:
 *                 type: string
 *                 format: uri
 *               sports:
 *                 type: array
 *                 items:
 *                   type: string
 *               age:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: object
 *               facility:
 *                 type: string
 *               operational_timing:
 *                 type: object
 *               media:
 *                 type: object
 *               bank_information:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *     responses:
 *       200:
 *         description: Coaching center updated successfully
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
 *                   example: "Coaching center updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Coaching center not found
 *       409:
 *         description: Email or mobile number already exists
 */
router.patch(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(coachingCenterUpdateSchema),
  coachingCenterController.updateCoachingCenter
);

// Media upload routes
router.use('/media', coachingCenterMediaRoutes);

export default router;

