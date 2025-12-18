import { Router } from 'express';
import * as coachingCenterController from '../../controllers/academy/coachingCenter.controller';
import { validate } from '../../middleware/validation.middleware';
import { academyCoachingCenterCreateSchema, academyCoachingCenterUpdateSchema } from '../../validations/coachingCenter.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import coachingCenterMediaRoutes from './coachingCenterMedia.routes';

const router = Router();

/**
 * @swagger
 * /academy/coaching-center:
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
   *           example:
   *             center_name: "Elite Sports Academy"
   *             mobile_number: "9876543210"
   *             email: "info@elitesportsacademy.com"
   *             logo: "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png"
   *             documents:
   *               - unique_id: "h8l9i1jk-02l4-1i53-i75h-70m60h154h1i"
   *                 url: "https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf"
   *             sports: ["507f1f77bcf86cd799439011"]
   *             sport_details:
   *               - sport_id: "507f1f77bcf86cd799439011"
   *                 description: "Professional cricket coaching with international level facilities. Our coaches have played at state and national levels."
   *                 images:
   *                   - unique_id: "aeddb4dc-35e7-4b86-b08a-03f93a487a4b"
   *                     url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
   *                 videos:
   *                   - unique_id: "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d"
   *                     url: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4"
   *                     thumbnail: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
   *             age:
   *               min: 5
   *               max: 18
   *             location:
   *               latitude: 28.6139
   *               longitude: 77.209
   *               address:
   *                 line1: "123 Sports Complex"
   *                 line2: "Near Metro Station"
   *                 city: "New Delhi"
   *                 state: "Delhi"
   *                 country: "India"
   *                 pincode: "110001"
   *             operational_timing:
   *               operating_days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
   *               opening_time: "09:00"
   *               closing_time: "18:00"
   *             bank_information:
   *               bank_name: "State Bank of India"
   *               account_number: "1234567890123456"
   *               ifsc_code: "SBIN0001234"
   *               account_holder_name: "Elite Sports Academy"
   *               gst_number: "07AABCU9603R1ZX"
   *             allowed_genders: ["male", "female"]
   *             allowed_disabled: false
   *             is_only_for_disabled: false
   *             experience: 5
   *             status: "draft"
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
 */
router.post(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyCoachingCenterCreateSchema),
  coachingCenterController.createCoachingCenter
);

/**
 * @swagger
 * /academy/coaching-center/my/list:
 *   get:
 *     summary: Get list of coaching centers for logged-in user
 *     tags: [Coaching Center]
 *     description: Retrieve a paginated list of coaching centers belonging to the authenticated user. Requires authentication and ACADEMY role.
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
 *         description: Coaching centers retrieved successfully
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
 *                   example: "Coaching centers retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CoachingCenter'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/my/list',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  coachingCenterController.getMyCoachingCenters
);

/**
 * @swagger
 * /academy/coaching-center/{id}:
 *   get:
 *     summary: Get coaching center by ID
 *     tags: [Coaching Center]
 *     description: Retrieve a coaching center by its ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Coaching center not found
 */
router.get('/:id', authenticate, authorize(DefaultRoles.ACADEMY), coachingCenterController.getCoachingCenter);

/**
 * @swagger
 * /academy/coaching-center/{id}:
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
   *             $ref: '#/components/schemas/CoachingCenterUpdateRequest'
   *           example:
   *             center_name: "Updated Elite Sports Academy"
   *             mobile_number: "9876543210"
   *             email: "info@elitesportsacademy.com"
   *             logo: "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png"
   *             documents:
   *               - unique_id: "h8l9i1jk-02l4-1i53-i75h-70m60h154h1i"
   *                 url: "https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf"
   *             sports: ["507f1f77bcf86cd799439011"]
   *             sport_details:
   *               - sport_id: "507f1f77bcf86cd799439011"
   *                 description: "Updated cricket coaching description"
   *                 images:
   *                   - unique_id: "aeddb4dc-35e7-4b86-b08a-03f93a487a4b"
   *                     url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
   *                 videos:
   *                   - unique_id: "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d"
   *                     url: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4"
   *                     thumbnail: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
   *             age:
   *               min: 5
   *               max: 18
   *             location:
   *               latitude: 28.6139
   *               longitude: 77.209
   *               address:
   *                 line1: "123 Sports Complex"
   *                 line2: "Updated Address"
   *                 city: "New Delhi"
   *                 state: "Delhi"
   *                 country: "India"
   *                 pincode: "110001"
   *             operational_timing:
   *               operating_days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
   *               opening_time: "07:00"
   *               closing_time: "10:00"
   *             bank_information:
   *               bank_name: "State Bank of India"
   *               account_number: "1234567890123456"
   *               ifsc_code: "SBIN0001234"
   *               account_holder_name: "Elite Sports Academy"
   *               gst_number: "07AABCU9603R1ZX"
   *             allowed_genders: ["male", "female", "other"]
   *             allowed_disabled: true
   *             is_only_for_disabled: false
   *             experience: 12
   *             status: "published"
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
 */
router.patch(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyCoachingCenterUpdateSchema),
  coachingCenterController.updateCoachingCenter
);

/**
 * @swagger
 * /academy/coaching-center/{id}/toggle-status:
 *   patch:
 *     summary: Toggle coaching center active status
 *     tags: [Coaching Center]
 *     description: Toggle coaching center active/inactive status. The is_active field will be automatically toggled (if current is true, it becomes false and vice versa). This controls whether the coaching center is active or inactive, not the draft/published status. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *     responses:
 *       200:
 *         description: Coaching center active status toggled successfully
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
 *                   example: "Coaching center activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Invalid request - ID required
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Coaching center not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  coachingCenterController.toggleCoachingCenterStatus
);

/**
 * @swagger
 * /academy/coaching-center/{id}:
 *   delete:
 *     summary: Delete coaching center
 *     tags: [Coaching Center]
 *     description: Soft delete a coaching center by setting is_deleted to true. The coaching center will no longer appear in regular queries. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *     responses:
 *       200:
 *         description: Coaching center deleted successfully
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
 *                   example: "Coaching center deleted successfully"
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid request - ID required
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Coaching center not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  coachingCenterController.deleteCoachingCenter
);

/**
 * @swagger
 * /academy/coaching-center/{id}/media:
 *   delete:
 *     summary: Remove media from coaching center (soft delete)
 *     tags: [Coaching Center]
 *     description: |
 *       Soft delete media from coaching center. Media is marked as deleted but remains in database.
 *       Supports: logo, documents, and sport-specific images/videos.
 *       For images/videos, sportId is required.
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
 *             required:
 *               - mediaType
 *               - uniqueId
 *             properties:
 *               mediaType:
 *                 type: string
 *                 enum: [logo, document, image, video]
 *                 example: image
 *                 description: Type of media to remove
 *               uniqueId:
 *                 type: string
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 description: Unique ID of the media item
 *               sportId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: Sport ID (required for image/video types)
 *     responses:
 *       200:
 *         description: Media removed successfully (soft deleted)
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
 *                   example: "Media removed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Coaching center or media not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/media',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  coachingCenterController.removeMedia
);

// Media upload routes
router.use('/media', authenticate, authorize(DefaultRoles.ACADEMY), coachingCenterMediaRoutes);

export default router;

