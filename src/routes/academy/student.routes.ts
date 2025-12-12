import { Router } from 'express';
import * as studentController from '../../controllers/academy/student.controller';
import { validate } from '../../middleware/validation.middleware';
import { academyEnrolledStudentsSchema } from '../../validations/booking.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/my-student:
 *   get:
 *     summary: Get enrolled students for academy
 *     tags: [Academy Student]
 *     description: Retrieve a paginated list of enrolled students grouped by participant (no duplicates). Shows student details including current age (calculated from DOB), batch name, sport name, booking status, and payment status for each enrollment. Requires authentication and ACADEMY role.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, left, completed, pending]
 *         description: Filter by overall student status (active = confirmed bookings, left = cancelled, completed = completed, pending = pending)
 *     responses:
 *       200:
 *         description: Enrolled students retrieved successfully
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
 *                   example: "Enrolled students retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EnrolledStudent'
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
  validate(academyEnrolledStudentsSchema),
  studentController.getEnrolledStudents
);

/**
 * @swagger
 * /academy/my-student/{participantId}:
 *   get:
 *     summary: Get detailed information about a specific enrolled student
 *     tags: [Academy Student]
 *     description: Retrieve comprehensive details about a specific enrolled student including all participant information (with age), complete user details, all batches with full batch information (scheduled timings, duration, capacity, fee structure), sport details, coaching center basic information (name, contact, location), and complete booking details (status, payment info, notes, timestamps). Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant ID
 *     responses:
 *       200:
 *         description: Student details retrieved successfully
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
 *                   example: "Student details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       $ref: '#/components/schemas/EnrolledStudentDetail'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Student not found
 */
router.get(
  '/:participantId',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  studentController.getEnrolledStudentDetail
);

export default router;
