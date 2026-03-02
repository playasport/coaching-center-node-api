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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController = __importStar(require("../../controllers/academy/employee.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const employee_validation_1 = require("../../validations/employee.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const employeeMedia_routes_1 = __importDefault(require("./employeeMedia.routes"));
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/employee:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee]
 *     description: Create a new employee. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - role
 *               - mobileNo
 *               - workingHours
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 description: Role ObjectId
 *               mobileNo:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               sport:
 *                 type: string
 *                 description: Sport ObjectId (optional)
 *               center:
 *                 type: string
 *                 description: Coaching Center ObjectId (optional)
 *               experience:
 *                 type: number
 *                 example: 5
 *               workingHours:
 *                 type: string
 *                 example: "9:00 AM - 6:00 PM"
 *               extraHours:
 *                 type: string
 *                 example: "2 hours"
 *               certification:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *               salary:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       409:
 *         description: Mobile number or email already exists
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(employee_validation_1.employeeCreateSchema), employeeController.createEmployee);
/**
 * @swagger
 * /academy/employee/my/list:
 *   get:
 *     summary: Get list of employees for logged-in user
 *     tags: [Employee]
 *     description: Retrieve a paginated list of employees belonging to the authenticated user. Requires authentication.
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
 *         name: roleName
 *         schema:
 *           type: string
 *         description: Filter employees by role name (case-insensitive)
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/my/list', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), employeeController.getMyEmployees);
/**
 * @swagger
 * /academy/employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employee]
 *     description: Retrieve an employee by its ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 */
router.get('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), employeeController.getEmployee);
/**
 * @swagger
 * /academy/employee/{id}:
 *   patch:
 *     summary: Update employee details
 *     tags: [Employee]
 *     description: Update employee details. All fields are optional. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *               mobileNo:
 *                 type: string
 *               email:
 *                 type: string
 *               sport:
 *                 type: string
 *               center:
 *                 type: string
 *               experience:
 *                 type: number
 *               workingHours:
 *                 type: string
 *               extraHours:
 *                 type: string
 *               certification:
 *                 type: array
 *               salary:
 *                 type: number
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Mobile number or email already exists
 */
router.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(employee_validation_1.employeeUpdateSchema), employeeController.updateEmployee);
/**
 * @swagger
 * /academy/employee/{id}/toggle-status:
 *   patch:
 *     summary: Toggle employee active status
 *     tags: [Employee]
 *     description: Toggle employee active/inactive status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee status toggled successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 */
router.patch('/:id/toggle-status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), employeeController.toggleEmployeeStatus);
/**
 * @swagger
 * /academy/employee/{id}:
 *   delete:
 *     summary: Delete employee (soft delete)
 *     tags: [Employee]
 *     description: Soft delete an employee by setting is_deleted to true. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), employeeController.deleteEmployee);
// Media upload routes for certifications
router.use('/media', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), employeeMedia_routes_1.default);
exports.default = router;
//# sourceMappingURL=employee.routes.js.map