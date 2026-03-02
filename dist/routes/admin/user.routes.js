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
const userController = __importStar(require("../../controllers/admin/user.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const adminUser_validation_1 = require("../../validations/adminUser.validation");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(auth_middleware_1.authenticate, admin_middleware_1.requireAdmin);
/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create user (admin)
 *     description: Create a new user with specified roles. A secure random password will be automatically generated and sent to the user's email. Requires user:create permission. Only "user" and "academy" roles can be assigned through this endpoint. Other roles (super_admin, admin, employee, agent) cannot be assigned.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminUserRequest'
 *           example:
 *             email: "newuser@example.com"
 *             firstName: "John"
 *             lastName: "Doe"
 *             mobile: "9876543210"
 *             gender: "male"
 *             dob: "1990-01-01T00:00:00.000Z"
 *             roles: ["user"]
 *             userType: "student"
 *             isActive: true
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: "User created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User created successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "newuser@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   dob: "1990-01-01T00:00:00.000Z"
 *                   roles:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Email already exists"
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
router.post('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(adminUser_validation_1.createAdminUserSchema), userController.createUser);
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     description: |
 *       Retrieve paginated list of users with "user" or "academy" roles only. Supports filtering and searching.
 *
 *       **Note:** This endpoint only returns users with "user" or "academy" roles. Users with other roles (super_admin, admin, employee, agent) are excluded from results.
 *
 *       **Available Filters:**
 *       - `search`: Search by first name, last name, email, or mobile number
 *       - `userType`: Filter by user type (student, guardian, academy, or other)
 *       - `isActive`: Filter by active status (true/false)
 *
 *       **Filter Examples:**
 *       - Get all students: `?userType=student`
 *       - Get all guardians: `?userType=guardian`
 *       - Get academy users: `?userType=academy`
 *       - Get other users (null/undefined userType): `?userType=other`
 *       - Search users: `?search=john`
 *       - Active users only: `?isActive=true`
 *       - Combine filters: `?userType=student&isActive=true&search=john`
 *
 *       Requires user:view permission.
 *     tags: [Admin Users]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, email, or mobile number
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [student, guardian, academy, other]
 *         description: Filter by user type (student, guardian, academy, or other for null/undefined userType)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *             example:
 *               success: true
 *               message: "Users retrieved successfully"
 *               data:
 *                 users:
 *                   - id: "550e8400-e29b-41d4-a716-446655440000"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     email: "john@example.com"
 *                     mobile: "9876543210"
 *                     gender: "male"
 *                     roles:
 *                       - id: "507f1f77bcf86cd799439011"
 *                         name: "user"
 *                         description: "Regular user"
 *                     userType: "student"
 *                     isActive: true
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1000
 *                   totalPages: 100
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
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.VIEW), userController.getAllUsers);
/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID (admin)
 *     description: Retrieve a specific user by ID. Requires user:view permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format for backward compatibility)
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: UUID format
 *           objectId:
 *             value: "69428b55c8c9ac23116e89da"
 *             summary: MongoDB ObjectId format
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User retrieved successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "john@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   dob: "1990-01-01T00:00:00.000Z"
 *                   roles:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.get('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.VIEW), userController.getUser);
/**
 * @swagger
 * /admin/users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user status (admin)
 *     description: Toggle a user's active status (activate if inactive, deactivate if active). No request body required. Requires user:update permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format for backward compatibility)
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: UUID format
 *           objectId:
 *             value: "69428b55c8c9ac23116e89da"
 *             summary: MongoDB ObjectId format
 *     responses:
 *       200:
 *         description: User status toggled successfully
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
 *                   example: "User activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User activated successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "user@example.com"
 *                   isActive: true
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.patch('/:id/toggle-status', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.UPDATE), userController.toggleUserStatus);
/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Update user (admin)
 *     description: Update a user. Requires user:update permission. All fields are optional. Roles can be updated by providing an array of role names. Only "user" and "academy" roles can be assigned through this endpoint. Other roles (super_admin, admin, employee, agent) cannot be assigned. Email can only be updated by super_admin. Password field is not available in update - use password reset flow instead.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format for backward compatibility)
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: UUID format
 *           objectId:
 *             value: "69428b55c8c9ac23116e89da"
 *             summary: MongoDB ObjectId format
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminUserRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Updated Last Name"
 *             mobile: "9876543210"
 *             gender: "male"
 *             roles: ["user"]
 *             userType: "student"
 *             isActive: true
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: "User updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User updated successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   firstName: "John"
 *                   lastName: "Updated Last Name"
 *                   email: "user@example.com"
 *                   mobile: "9876543210"
 *                   gender: "male"
 *                   roles:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       name: "user"
 *                       description: "Regular user"
 *                   userType: "student"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-15T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or invalid roles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "One or more roles are invalid"
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.patch('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.UPDATE), (0, validation_middleware_1.validate)(adminUser_validation_1.updateAdminUserSchema), userController.updateUser);
/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user (admin)
 *     description: Soft delete a user. Requires user:delete permission.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (supports both UUID format and MongoDB ObjectId format for backward compatibility)
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: UUID format
 *           objectId:
 *             value: "69428b55c8c9ac23116e89da"
 *             summary: MongoDB ObjectId format
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: "User deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "User deleted successfully"
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.delete('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.USER, section_enum_2.Action.DELETE), userController.deleteUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map