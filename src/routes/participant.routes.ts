import { Router } from 'express';
import * as participantController from '../controllers/participant.controller';
import { validate } from '../middleware/validation.middleware';
import { participantCreateSchema, participantUpdateSchema } from '../validations/participant.validation';
import { authenticate } from '../middleware/auth.middleware';
import { uploadProfileImage } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /user/participant:
 *   post:
 *     summary: Create a new participant
 *     tags: [Participant]
 *     description: Create a new participant. Requires authentication. Users can only create participants for themselves. Supports profile photo upload via multipart/form-data (field name: 'profileImage'). If both file and profilePhoto URL are provided, the file takes precedence.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional profile photo file (JPEG, PNG, WebP)
 *               firstName:
 *                 type: string
 *                 nullable: true
 *               lastName:
 *                 type: string
 *                 nullable: true
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 nullable: true
 *               disability:
 *                 type: string
 *                 enum: ['0', '1']
 *                 default: '0'
 *               dob:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               schoolName:
 *                 type: string
 *                 nullable: true
 *               contactNumber:
 *                 type: string
 *                 nullable: true
 *               profilePhoto:
 *                 type: string
 *                 format: uri
 *                 description: Optional profile photo URL (ignored if profileImage file is provided)
 *                 nullable: true
 *               address:
 *                 type: object
 *                 nullable: true
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParticipantCreateRequest'
 *     responses:
 *       201:
 *         description: Participant created successfully
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
 *                   example: "Participant created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     participant:
 *                       $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.post(
  '/',
  authenticate,
  uploadProfileImage,
  validate(participantCreateSchema),
  participantController.createParticipant
);

/**
 * @swagger
 * /user/participant/my/list:
 *   get:
 *     summary: Get list of participants for logged-in user
 *     tags: [Participant]
 *     description: Retrieve a paginated list of participants belonging to the authenticated user. Requires authentication.
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
 *         description: Participants retrieved successfully
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
 *                   example: "Participants retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Participant'
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
 */
router.get(
  '/my/list',
  authenticate,
  participantController.getMyParticipants
);

/**
 * @swagger
 * /user/participant/{id}:
 *   get:
 *     summary: Get participant by ID
 *     tags: [Participant]
 *     description: Retrieve a participant by its ID. Users can only view their own participants. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant ID
 *     responses:
 *       200:
 *         description: Participant retrieved successfully
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
 *                   example: "Participant retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     participant:
 *                       $ref: '#/components/schemas/Participant'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Participant not found
 */
router.get('/:id', authenticate, participantController.getParticipant);

/**
 * @swagger
 * /user/participant/{id}:
 *   patch:
 *     summary: Update participant details
 *     tags: [Participant]
 *     description: Update participant details. All fields are optional. Users can only update their own participants. Requires authentication. Supports profile photo upload via multipart/form-data (field name: 'profileImage'). If a file is uploaded, the old profile photo will be automatically deleted from S3. If both file and profilePhoto URL are provided, the file takes precedence.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional profile photo file (JPEG, PNG, WebP). Old photo will be deleted if new one is uploaded.
 *               firstName:
 *                 type: string
 *                 nullable: true
 *               lastName:
 *                 type: string
 *                 nullable: true
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 nullable: true
 *               disability:
 *                 type: string
 *                 enum: ['0', '1']
 *               dob:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               schoolName:
 *                 type: string
 *                 nullable: true
 *               contactNumber:
 *                 type: string
 *                 nullable: true
 *               profilePhoto:
 *                 type: string
 *                 format: uri
 *                 description: Optional profile photo URL (ignored if profileImage file is provided)
 *                 nullable: true
 *               address:
 *                 type: object
 *                 nullable: true
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParticipantUpdateRequest'
 *     responses:
 *       200:
 *         description: Participant updated successfully
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
 *                   example: "Participant updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     participant:
 *                       $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Participant not found
 */
router.patch(
  '/:id',
  authenticate,
  uploadProfileImage,
  validate(participantUpdateSchema),
  participantController.updateParticipant
);

export default router;