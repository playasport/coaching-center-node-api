import { Router } from 'express';
import * as coachingCenterController from '../../controllers/admin/coachingCenter.controller';
import { validate } from '../../middleware/validation.middleware';
import { adminCoachingCenterCreateSchema, adminCoachingCenterUpdateSchema } from '../../validations/coachingCenter.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import coachingCenterMediaRoutes from './coachingCenterMedia.routes';

const router = Router();

// Media upload routes - defined before ID parameter routes to avoid conflict
router.use('/media', coachingCenterMediaRoutes);

// All other routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/coaching-centers:
 *   get:
 *     summary: Get all coaching centers (admin)
 *     description: Retrieve paginated list of all coaching centers with user and sport details. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *         description: Filter by center status
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by active status
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter by sport ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by center name, email, or mobile number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by (e.g., createdAt, center_name)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc for ascending, desc for descending). Defaults to desc (newer first).
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
 *                     coachingCenters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CoachingCenter'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *             example:
 *               success: true
 *               message: "Coaching centers retrieved successfully"
 *               data:
 *                 coachingCenters:
 *                   - id: "cc-123"
 *                     center_name: "Elite Sports Academy"
 *                     email: "elite@example.com"
 *                     mobile_number: "9876543210"
 *                     logo: "https://example.com/logo.png"
 *                     status: "published"
 *                     is_active: true
 *                 pagination:
 *                   total: 150
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 15
 *                   hasNextPage: true
 *                   hasPrevPage: false
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 */
router.get(
  '/',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getAllCoachingCenters
);

/**
 * @swagger
 * /admin/coaching-centers:
 *   post:
 *     summary: Create coaching center (admin)
 *     description: Create a coaching center for a specific academy user. Requires coaching_center:create permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCoachingCenterCreateRequest'
   *           example:
   *             academy_owner:
   *               firstName: "John"
   *               lastName: "Doe"
   *               email: "john.academy@example.com"
   *               mobile: "9876543210"
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
   *             allowed_genders: ["male", "female"]
   *             allowed_disabled: false
   *             is_only_for_disabled: false
   *             experience: 5
   *             status: "published"
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
 *         description: Bad request
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  requirePermission(Section.COACHING_CENTER, Action.CREATE),
  validate(adminCoachingCenterCreateSchema),
  coachingCenterController.createCoachingCenterByAdmin
);

/**
 * @swagger
 * /admin/coaching-centers/user/{userId}:
 *   get:
 *     summary: Get coaching centers by user ID (admin)
 *     description: Retrieve all coaching centers belonging to a specific academy user with pagination. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
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
 *                     coachingCenters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CoachingCenter'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/user/:userId',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getCoachingCentersByUserId
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   get:
 *     summary: Get coaching center by ID (admin)
 *     description: Retrieve a specific coaching center by ID. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
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
 *             example:
 *               success: true
 *               message: "Coaching center retrieved successfully"
 *               data:
 *                 coachingCenter:
 *                   id: "cc-123"
 *                   center_name: "Elite Sports Academy"
 *                   email: "elite@example.com"
 *                   logo: "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png"
 *                   documents:
 *                     - unique_id: "doc-1"
 *                       url: "https://example.com/cert.pdf"
 *                   sport_details:
 *                     - sport_id: "507f1f77bcf86cd799439011"
 *                       description: "Cricket coaching"
 *                       images:
 *                         - unique_id: "img-1"
 *                           url: "https://example.com/img1.jpg"
 *                       videos:
 *                         - unique_id: "vid-1"
 *                           url: "https://example.com/vid1.mp4"
 *                           thumbnail: "https://example.com/thumb1.jpg"
 *                   status: "published"
 *                   is_active: true
 *       404:
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.get(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getCoachingCenter
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   patch:
 *     summary: Update coaching center (admin)
 *     description: Update a coaching center. Requires coaching_center:update permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCoachingCenterUpdateRequest'
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
 *             example:
 *               success: true
 *               message: "Coaching center updated successfully"
 *               data:
 *                 coachingCenter:
 *                   id: "cc-123"
 *                   center_name: "Updated Elite Sports Academy"
 *                   status: "published"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 *       404:
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.patch(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  validate(adminCoachingCenterUpdateSchema),
  coachingCenterController.updateCoachingCenter
);

/**
 * @swagger
 * /admin/coaching-centers/{id}/toggle-status:
 *   patch:
 *     summary: Toggle coaching center status (admin)
 *     description: Activate or deactivate a coaching center. Requires coaching_center:update permission.
 *     tags: [Admin Coaching Centers]
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
 *                   example: "Coaching center updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 */
router.patch(
  '/:id/toggle-status',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  coachingCenterController.toggleStatus
);

/**
 * @swagger
 * /admin/coaching-centers/{id}:
 *   delete:
 *     summary: Delete coaching center (admin)
 *     description: Delete a coaching center. Requires coaching_center:delete permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID
 *         example: "cc-123"
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
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Coaching center deleted successfully"
 *               data: null
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 *       404:
 *         description: Coaching center not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Coaching center not found"
 */
router.delete(
  '/:id',
  requirePermission(Section.COACHING_CENTER, Action.DELETE),
  coachingCenterController.deleteCoachingCenter
);

/**
 * @swagger
 * /admin/coaching-centers/{id}/media:
 *   delete:
 *     summary: Remove media from coaching center (admin)
 *     tags: [Admin Coaching Centers]
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
 *             required: [mediaType, uniqueId]
 *             properties:
 *               mediaType:
 *                 type: string
 *                 enum: [logo, document, image, video]
 *               uniqueId:
 *                 type: string
 *               sportId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Media removed successfully
 */
router.delete(
  '/:id/media',
  requirePermission(Section.COACHING_CENTER, Action.DELETE),
  coachingCenterController.removeMedia
);

export default router;
