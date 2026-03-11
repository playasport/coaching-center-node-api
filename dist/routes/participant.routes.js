"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const participantController = __importStar(require("../controllers/participant.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const participant_validation_1 = require("../validations/participant.validation");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /user/participant:
 *   post:
 *     summary: Create a new participant
 *     tags: [Participant]
 *     description: "Create a new participant. Requires authentication. Users can only create participants for themselves. Supports profile photo upload via multipart/form-data (field name: 'profileImage'). If both file and profilePhoto URL are provided, the file takes precedence."
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
router.post('/', auth_middleware_1.authenticate, upload_middleware_1.uploadProfileImage, (0, validation_middleware_1.validate)(participant_validation_1.participantCreateSchema), participantController.createParticipant);
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
router.get('/my/list', auth_middleware_1.authenticate, participantController.getMyParticipants);
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
router.get('/:id', auth_middleware_1.authenticate, participantController.getParticipant);
/**
 * @swagger
 * /user/participant/{id}:
 *   patch:
 *     summary: Update participant details
 *     tags: [Participant]
 *     description: "Update participant details. All fields are optional. Users can only update their own participants. Requires authentication. Supports profile photo upload via multipart/form-data (field name: 'profileImage'). If a file is uploaded, the old profile photo will be automatically deleted from S3. If both file and profilePhoto URL are provided, the file takes precedence."
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
router.patch('/:id', auth_middleware_1.authenticate, upload_middleware_1.uploadProfileImage, (0, validation_middleware_1.validate)(participant_validation_1.participantUpdateSchema), participantController.updateParticipant);
exports.default = router;
//# sourceMappingURL=participant.routes.js.map