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
const adminFacilityController = __importStar(require("../../controllers/admin/facility.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const facility_validation_1 = require("../../validations/facility.validation");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
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
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(facility_validation_1.getFacilitiesQuerySchema), adminFacilityController.getAllFacilities);
router.post('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(facility_validation_1.createFacilitySchema), adminFacilityController.createFacility);
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
router.get('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.VIEW), adminFacilityController.getFacilityById);
router.patch('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.UPDATE), (0, validation_middleware_1.validate)(facility_validation_1.updateFacilitySchema), adminFacilityController.updateFacility);
router.delete('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.DELETE), adminFacilityController.deleteFacility);
/**
 * @swagger
 * /admin/facilities/{id}/restore:
 *   patch:
 *     summary: Restore soft-deleted facility (admin)
 *     tags: [Admin Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Restore a soft-deleted facility by setting isDeleted to false. Requires facility:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Facility ID (supports both MongoDB ObjectId format and custom_id UUID format)
 *     responses:
 *       200:
 *         description: Facility restored successfully
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
 *                   example: "Facility restored successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     facility:
 *                       $ref: '#/components/schemas/Facility'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Deleted facility not found
 */
router.patch('/:id/restore', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.FACILITY, section_enum_2.Action.UPDATE), adminFacilityController.restoreFacility);
exports.default = router;
//# sourceMappingURL=facility.routes.js.map