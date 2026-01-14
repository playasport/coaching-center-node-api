import { Router } from 'express';
import * as userController from '../../controllers/academy/user.controller';
import { validate } from '../../middleware/validation.middleware';
import { academyEnrolledUsersSchema } from '../../validations/booking.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/user:
 *   get:
 *     summary: Get enrolled users for academy
 *     tags: [Academy User]
 *     description: Retrieve a paginated list of unique users who have enrolled participants in the academy's coaching centers. Shows user details including total bookings, active bookings, total participants, associated centers, and enrolled batches. Supports filtering by center, batch, userType, and searching by name, email, or mobile. Requires authentication and ACADEMY role.
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
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter by coaching center ID
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [student, guardian]
 *         description: Filter by user type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, email, or mobile number (case-insensitive partial match)
 *     responses:
 *       200:
 *         description: Enrolled users retrieved successfully
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
 *                   example: "Enrolled users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: User ID
 *                           firstName:
 *                             type: string
 *                             description: User's first name
 *                           lastName:
 *                             type: string
 *                             nullable: true
 *                             description: User's last name
 *                           email:
 *                             type: string
 *                             description: User's email address
 *                           mobile:
 *                             type: string
 *                             nullable: true
 *                             description: User's mobile number
 *                           profileImage:
 *                             type: string
 *                             nullable: true
 *                             description: User's profile image URL
 *                           userType:
 *                             type: string
 *                             nullable: true
 *                             enum: [student, guardian]
 *                             description: User type (student or guardian)
 *                           registrationMethod:
 *                             type: string
 *                             nullable: true
 *                             enum: [email, mobile, google, facebook, apple, instagram]
 *                             description: How the user registered (email, mobile, google, facebook, apple, or instagram)
 *                           address:
 *                             type: object
 *                             nullable: true
 *                             description: User's address
 *                             properties:
 *                               line1:
 *                                 type: string
 *                                 nullable: true
 *                               line2:
 *                                 type: string
 *                               area:
 *                                 type: string
 *                                 nullable: true
 *                               city:
 *                                 type: string
 *                               state:
 *                                 type: string
 *                               country:
 *                                 type: string
 *                               pincode:
 *                                 type: string
 *                           totalBookings:
 *                             type: integer
 *                             description: Total number of bookings made by this user
 *                           activeBookings:
 *                             type: integer
 *                             description: Number of active (confirmed) bookings
 *                           totalParticipants:
 *                             type: integer
 *                             description: Count of unique enrolled batches for this user
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
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 5
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
 */
router.get(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyEnrolledUsersSchema),
  userController.getEnrolledUsers
);

/**
 * @swagger
 * /academy/user/{userId}:
 *   get:
 *     summary: Get detailed information about a specific enrolled user
 *     tags: [Academy User]
 *     description: Retrieve comprehensive details about a specific enrolled user including complete user information, all participants associated with the user, and all bookings with full batch, sport, center, and payment details. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID or MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                   example: "User details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: Complete user information (without createdAt and updatedAt)
 *                       properties:
 *                         id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                           nullable: true
 *                         email:
 *                           type: string
 *                         mobile:
 *                           type: string
 *                           nullable: true
 *                         profileImage:
 *                           type: string
 *                           nullable: true
 *                         userType:
 *                           type: string
 *                           nullable: true
 *                           enum: [student, guardian]
 *                         registrationMethod:
 *                           type: string
 *                           nullable: true
 *                           enum: [email, mobile, google, facebook, apple, instagram]
 *                         gender:
 *                           type: string
 *                           nullable: true
 *                         dob:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         address:
 *                           type: object
 *                           nullable: true
 *                     participants:
 *                       type: array
 *                       description: All participants associated with this user
 *                       items:
 *                         type: object
 *                     totalBookings:
 *                       type: integer
 *                       description: Total number of bookings made by this user
 *                     activeBookings:
 *                       type: integer
 *                       description: Number of active (confirmed) bookings
 *                     totalParticipants:
 *                       type: integer
 *                       description: Total number of participants associated with this user
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: User not found or has no enrollments
 */
router.get(
  '/:userId',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  userController.getEnrolledUserDetail
);

export default router;
