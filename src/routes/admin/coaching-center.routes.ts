import { Router, Request, Response, NextFunction } from 'express';
import * as coachingCenterController from '../../controllers/admin/coachingCenter.controller';
import { validate } from '../../middleware/validation.middleware';
import { adminCoachingCenterCreateSchema, adminCoachingCenterUpdateSchema } from '../../validations/coachingCenter.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import coachingCenterMediaRoutes from './coachingCenterMedia.routes';
import { uploadThumbnail } from '../../middleware/coachingCenterUpload.middleware';

const router = Router();

// Media upload routes - defined before ID parameter routes to avoid conflict
router.use('/media', coachingCenterMediaRoutes);

// All other routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/coaching-centers/stats:
 *   get:
 *     summary: Get coaching center statistics for admin dashboard
 *     description: Retrieve comprehensive statistics about coaching centers including counts by status, sport, location, and more. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics until this date (YYYY-MM-DD)
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
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [approved, rejected, pending_approval]
 *         description: Filter by approval status - 'approved' for approved academies, 'rejected' for rejected academies, 'pending_approval' for pending approval
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
 *     responses:
 *       200:
 *         description: Successfully retrieved coaching center statistics
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
 *                   example: "Coaching center statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 250
 *                         byStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             draft: 50
 *                             published: 200
 *                         byActiveStatus:
 *                           type: object
 *                           properties:
 *                             active:
 *                               type: number
 *                               example: 220
 *                             inactive:
 *                               type: number
 *                               example: 30
 *                         byApprovalStatus:
 *                           type: object
 *                           properties:
 *                             approved:
 *                               type: number
 *                               example: 200
 *                             rejected:
 *                               type: number
 *                               example: 10
 *                             pending_approval:
 *                               type: number
 *                               example: 40
 *                         bySport:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             Cricket: 80
 *                             Football: 60
 *                             Basketball: 40
 *                             Tennis: 30
 *                             Swimming: 40
 *                         byCity:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             "New Delhi": 50
 *                             "Mumbai": 45
 *                             "Bangalore": 40
 *                             "Chennai": 35
 *                         byState:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             "Delhi": 50
 *                             "Maharashtra": 45
 *                             "Karnataka": 40
 *                             "Tamil Nadu": 35
 *                         allowingDisabled:
 *                           type: number
 *                           example: 150
 *                         onlyForDisabled:
 *                           type: number
 *                           example: 10
 *                       example:
 *                         total: 250
 *                         byStatus:
 *                           draft: 50
 *                           published: 200
 *                         byActiveStatus:
 *                           active: 220
 *                           inactive: 30
 *                         byApprovalStatus:
 *                           approved: 200
 *                           rejected: 10
 *                           pending_approval: 40
 *                         bySport:
 *                           Cricket: 80
 *                           Football: 60
 *                           Basketball: 40
 *                           Tennis: 30
 *                           Swimming: 40
 *                         byCity:
 *                           "New Delhi": 50
 *                           "Mumbai": 45
 *                           "Bangalore": 40
 *                           "Chennai": 35
 *                         byState:
 *                           "Delhi": 50
 *                           "Maharashtra": 45
 *                           "Karnataka": 40
 *                           "Tamil Nadu": 35
 *                         allowingDisabled: 150
 *                         onlyForDisabled: 10
 *       403:
 *         description: Forbidden - Insufficient permissions
 * 
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
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [approved, rejected, pending_approval]
 *         description: Filter by approval status - 'approved' for approved academies, 'rejected' for rejected academies, 'pending_approval' for pending approval
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
 *                     user:
 *                       id: "user-123"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       email: "john@example.com"
 *                       mobile: "+919876543210"
 *                     sports:
 *                       - id: "sport-123"
 *                         name: "Cricket"
 *                       - id: "sport-456"
 *                         name: "Football"
 *                     location:
 *                       latitude: 28.6139
 *                       longitude: 77.209
 *                       address:
 *                         line1: "123 Sports Complex"
 *                         line2: "Near Metro Station"
 *                         city: "New Delhi"
 *                         state: "Delhi"
 *                         country: "India"
 *                         pincode: "110001"
 *                     createdAt: "2024-01-15T10:00:00.000Z"
 *                     updatedAt: "2024-01-15T10:00:00.000Z"
 *                 pagination:
 *                   total: 150
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 15
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
  '/stats',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.getCoachingCenterStats
);

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
   *           examples:
   *             withOwnerId:
   *               summary: Using existing owner_id
   *               description: Use an existing user ID as the academy owner
   *               value:
   *                 owner_id: "f316a86c-2909-4d32-8983-eb225c715bcb"
   *                 center_name: "Elite Sports Academy"
   *                 mobile_number: "9876543210"
   *                 email: "info@elitesportsacademy.com"
   *                 logo: "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png"
   *                 documents:
   *                   - unique_id: "h8l9i1jk-02l4-1i53-i75h-70m60h154h1i"
   *                     url: "https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf"
   *                 sports: ["507f1f77bcf86cd799439011"]
   *                 sport_details:
   *                   - sport_id: "507f1f77bcf86cd799439011"
   *                     description: "Professional cricket coaching with international level facilities. Our coaches have played at state and national levels."
   *                     images:
   *                       - unique_id: "aeddb4dc-35e7-4b86-b08a-03f93a487a4b"
   *                         url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
   *                     videos:
   *                       - unique_id: "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d"
   *                         url: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4"
   *                         thumbnail: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
   *                 age:
   *                   min: 5
   *                   max: 18
   *                 location:
   *                   latitude: 28.6139
   *                   longitude: 77.209
   *                   address:
   *                     line1: "123 Sports Complex"
   *                     line2: "Near Metro Station"
   *                     city: "New Delhi"
   *                     state: "Delhi"
   *                     country: "India"
   *                     pincode: "110001"
   *                 operational_timing:
   *                   operating_days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
   *                   opening_time: "09:00"
   *                   closing_time: "18:00"
   *                 allowed_genders: ["male", "female"]
   *                 allowed_disabled: false
   *                 is_only_for_disabled: false
   *                 experience: 5
   *                 status: "published"
   *             withAcademyOwner:
   *               summary: Creating new academy owner
   *               description: Provide academy_owner details to create a new user if doesn't exist
   *               value:
   *                 academy_owner:
   *                   firstName: "John"
   *                   lastName: "Doe"
   *                   email: "john.academy@example.com"
   *                   mobile: "9876543210"
   *                 center_name: "Elite Sports Academy"
   *                 mobile_number: "9876543210"
   *                 email: "info@elitesportsacademy.com"
   *                 logo: "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png"
   *                 documents:
   *                   - unique_id: "h8l9i1jk-02l4-1i53-i75h-70m60h154h1i"
   *                     url: "https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf"
   *                 sports: ["507f1f77bcf86cd799439011"]
   *                 sport_details:
   *                   - sport_id: "507f1f77bcf86cd799439011"
   *                     description: "Professional cricket coaching with international level facilities. Our coaches have played at state and national levels."
   *                     images:
   *                       - unique_id: "aeddb4dc-35e7-4b86-b08a-03f93a487a4b"
   *                         url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
   *                     videos:
   *                       - unique_id: "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d"
   *                         url: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4"
   *                         thumbnail: "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
   *                 age:
   *                   min: 5
   *                   max: 18
   *                 location:
   *                   latitude: 28.6139
   *                   longitude: 77.209
   *                   address:
   *                     line1: "123 Sports Complex"
   *                     line2: "Near Metro Station"
   *                     city: "New Delhi"
   *                     state: "Delhi"
   *                     country: "India"
   *                     pincode: "110001"
   *                 operational_timing:
   *                   operating_days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
   *                   opening_time: "09:00"
   *                   closing_time: "18:00"
   *                 allowed_genders: ["male", "female"]
   *                 allowed_disabled: false
   *                 is_only_for_disabled: false
   *                 experience: 5
   *                 status: "published"
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

/**
 * @swagger
 * /admin/coaching-centers/{id}/banner-image:
 *   post:
 *     summary: Set image as banner for coaching center (admin)
 *     tags: [Admin Coaching Centers]
 *     description: |
 *       Set an image as banner for the coaching center. Only one image can be banner at a time.
 *       If another image is already set as banner, it will be automatically unset.
 *       Requires sportId and imageUniqueId to identify the specific image.
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
 *             required: [sportId, imageUniqueId]
 *             properties:
 *               sportId:
 *                 type: string
 *                 description: Sport ID to which the image belongs
 *                 example: "693a9e96b4d798f46c93863a"
 *               imageUniqueId:
 *                 type: string
 *                 description: Unique ID of the image to set as banner
 *                 example: "temp-1766995041861-0.5991171012451707"
 *     responses:
 *       200:
 *         description: Banner image set successfully
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
 *                   example: "Banner image set successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: Coaching center, sport detail, or image not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/:id/banner-image',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  coachingCenterController.setBannerImage
);

/**
 * @swagger
 * /admin/coaching-centers/{id}/video-thumbnail:
 *   post:
 *     summary: Upload video thumbnail for coaching center (admin)
 *     tags: [Admin Coaching Centers]
 *     description: |
 *       Upload and set a thumbnail image file for a video in the coaching center.
 *       The thumbnail image file will be uploaded to S3 and automatically compressed.
 *       Requires sportId, videoUniqueId, and thumbnail image file.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [sportId, videoUniqueId, thumbnail]
 *             properties:
 *               sportId:
 *                 type: string
 *                 description: Sport ID to which the video belongs
 *                 example: "693a9e96b4d798f46c93863a"
 *               videoUniqueId:
 *                 type: string
 *                 description: Unique ID of the video
 *                 example: "temp-1766995051707-0.5786953663983029"
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image file (JPEG, PNG, WebP) - max 5MB. Image will be automatically compressed.
 *     responses:
 *       200:
 *         description: Video thumbnail uploaded successfully
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
 *                   example: "Video thumbnail uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Bad request - Missing required fields or invalid file
 *       404:
 *         description: Coaching center, sport detail, or video not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/:id/video-thumbnail',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  uploadThumbnail,
  coachingCenterController.uploadVideoThumbnail
);

/**
 * @swagger
 * /admin/coaching-centers/export/excel:
 *   get:
 *     summary: Export coaching centers to Excel
 *     description: Export coaching centers data to Excel format with date-wise filtering. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Excel file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/export/excel',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.exportToExcel
);

/**
 * @swagger
 * /admin/coaching-centers/export/pdf:
 *   get:
 *     summary: Export coaching centers to PDF
 *     description: Export coaching centers data to PDF format with date-wise filtering. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: PDF file downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/export/pdf',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.exportToPDF
);

/**
 * @swagger
 * /admin/coaching-centers/export/csv:
 *   get:
 *     summary: Export coaching centers to CSV
 *     description: Export coaching centers data to CSV format with date-wise filtering. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: CSV file downloaded successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/export/csv',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  coachingCenterController.exportToCSV
);

/**
 * @swagger
 * /admin/coaching-centers/export/academies:
 *   get:
 *     summary: Export all academies (published and active coaching centers)
 *     description: Convenience endpoint to export all published and active coaching centers (academies) in Excel, PDF, or CSV format. Requires coaching_center:view permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *         description: Export format (excel, pdf, or csv)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
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
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *             description: Excel file (when format=excel)
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             description: PDF file (when format=pdf)
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *             description: CSV file (when format=csv)
 *       400:
 *         description: Invalid format parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Format parameter is required and must be one of: excel, pdf, csv"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/export/academies',
  requirePermission(Section.COACHING_CENTER, Action.VIEW),
  (req: Request, res: Response, next: NextFunction) => {
    // Set default filters for academies (published and active)
    req.query.status = 'published';
    req.query.isActive = 'true';
    
    const format = req.query.format as string;
    
    if (!format || !['excel', 'pdf', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Format parameter is required and must be one of: excel, pdf, csv'
      });
    }
    
    // Route to appropriate export handler
    if (format === 'excel') {
      return coachingCenterController.exportToExcel(req, res, next);
    } else if (format === 'pdf') {
      return coachingCenterController.exportToPDF(req, res, next);
    } else {
      return coachingCenterController.exportToCSV(req, res, next);
    }
  }
);

/**
 * @swagger
 * /admin/coaching-centers/{id}/approval:
 *   patch:
 *     summary: Approve or reject coaching center
 *     description: Approve or reject a coaching center. Only super_admin and admin can perform this action. When rejecting, a reject reason can be provided. Requires coaching_center:update permission.
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coaching center ID (UUID or MongoDB ObjectId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isApproved
 *             properties:
 *               isApproved:
 *                 type: boolean
 *                 description: true to approve, false to reject
 *                 example: true
 *               rejectReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for rejection (required when isApproved is false)
 *                 example: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Approval status updated successfully
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
 *                   example: "Academy approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coachingCenter:
 *                       $ref: '#/components/schemas/CoachingCenter'
 *       400:
 *         description: Bad request (invalid isApproved value or missing reject reason)
 *       403:
 *         description: Forbidden - Only super admin and admin can approve/reject
 *       404:
 *         description: Coaching center not found
 */
router.patch(
  '/:id/approval',
  requirePermission(Section.COACHING_CENTER, Action.UPDATE),
  coachingCenterController.updateApprovalStatus
);

export default router;
