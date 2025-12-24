import { Router } from 'express';
import * as adminFacilityController from '../../controllers/admin/facility.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validation.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import {
  createFacilitySchema,
  updateFacilitySchema,
  getFacilitiesQuerySchema,
} from '../../validations/facility.validation';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/facilities:
 *   get:
 *     summary: Get all facilities for admin
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve paginated list of all facilities with filters and search. Requires facility:view permission.
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description, or custom_id
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by (name, createdAt, updatedAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Facilities retrieved successfully
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
 *                   example: "Facilities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     facilities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Facility'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *             example:
 *               success: true
 *               message: "Facilities retrieved successfully"
 *               data:
 *                 facilities:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     name: "Swimming Pool"
 *                     description: "Olympic size swimming pool"
 *                     icon: "https://example.com/icons/swimming.png"
 *                     is_active: true
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 50
 *                   totalPages: 5
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
 *   post:
 *     summary: Create new facility
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new facility. Requires facility:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFacilityRequest'
 *           example:
 *             name: "Swimming Pool"
 *             description: "Olympic size swimming pool with modern facilities"
 *             icon: "https://example.com/icons/swimming.png"
 *             is_active: true
 *     responses:
 *       201:
 *         description: Facility created successfully
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
 *                   example: "Facility created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     facility:
 *                       $ref: '#/components/schemas/Facility'
 *             example:
 *               success: true
 *               message: "Facility created successfully"
 *               data:
 *                 facility:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "Swimming Pool"
 *                   description: "Olympic size swimming pool with modern facilities"
 *                   icon: "https://example.com/icons/swimming.png"
 *                   is_active: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or facility name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Facility with this name already exists"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  requirePermission(Section.FACILITY, Action.VIEW),
  validate(getFacilitiesQuerySchema),
  adminFacilityController.getAllFacilities
);

router.post(
  '/',
  requirePermission(Section.FACILITY, Action.CREATE),
  validate(createFacilitySchema),
  adminFacilityController.createFacility
);

/**
 * @swagger
 * /admin/facilities/{id}:
 *   get:
 *     summary: Get facility by ID (admin)
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific facility by ID. Supports both MongoDB ObjectId and custom_id. Requires facility:view permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Facility ID (supports both MongoDB ObjectId format and custom_id UUID format)
 *         examples:
 *           objectId:
 *             value: "507f1f77bcf86cd799439011"
 *             summary: MongoDB ObjectId format
 *           customId:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: Custom ID UUID format
 *     responses:
 *       200:
 *         description: Facility retrieved successfully
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
 *                   example: "Facility retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     facility:
 *                       $ref: '#/components/schemas/Facility'
 *             example:
 *               success: true
 *               message: "Facility retrieved successfully"
 *               data:
 *                 facility:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "Swimming Pool"
 *                   description: "Olympic size swimming pool"
 *                   icon: "https://example.com/icons/swimming.png"
 *                   is_active: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Facility not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Facility not found"
 *   patch:
 *     summary: Update facility (admin)
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Update a facility. All fields are optional. Requires facility:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Facility ID (supports both MongoDB ObjectId format and custom_id UUID format)
 *         examples:
 *           objectId:
 *             value: "507f1f77bcf86cd799439011"
 *             summary: MongoDB ObjectId format
 *           customId:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: Custom ID UUID format
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateFacilityRequest'
 *           example:
 *             name: "Updated Swimming Pool"
 *             description: "Updated description"
 *             icon: "https://example.com/icons/swimming-updated.png"
 *             is_active: true
 *     responses:
 *       200:
 *         description: Facility updated successfully
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
 *                   example: "Facility updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     facility:
 *                       $ref: '#/components/schemas/Facility'
 *             example:
 *               success: true
 *               message: "Facility updated successfully"
 *               data:
 *                 facility:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "Updated Swimming Pool"
 *                   description: "Updated description"
 *                   icon: "https://example.com/icons/swimming-updated.png"
 *                   is_active: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-15T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or facility name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Facility with this name already exists"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Facility not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Facility not found"
 *   delete:
 *     summary: Delete facility (admin)
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Soft delete a facility by setting is_active to false. Requires facility:delete permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Facility ID (supports both MongoDB ObjectId format and custom_id UUID format)
 *         examples:
 *           objectId:
 *             value: "507f1f77bcf86cd799439011"
 *             summary: MongoDB ObjectId format
 *           customId:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: Custom ID UUID format
 *     responses:
 *       200:
 *         description: Facility deleted successfully
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
 *                   example: "Facility deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Facility deleted successfully"
 *               data: null
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Facility not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Facility not found"
 */
router.get(
  '/:id',
  requirePermission(Section.FACILITY, Action.VIEW),
  adminFacilityController.getFacilityById
);

router.patch(
  '/:id',
  requirePermission(Section.FACILITY, Action.UPDATE),
  validate(updateFacilitySchema),
  adminFacilityController.updateFacility
);

router.delete(
  '/:id',
  requirePermission(Section.FACILITY, Action.DELETE),
  adminFacilityController.deleteFacility
);

export default router;

