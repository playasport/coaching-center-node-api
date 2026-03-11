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
const studentController = __importStar(require("../../controllers/academy/student.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const booking_validation_1 = require("../../validations/booking.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(booking_validation_1.academyEnrolledStudentsSchema), studentController.getEnrolledStudents);
/**
 * @swagger
 * /academy/my-student/export/excel:
 *   get:
 *     summary: Export enrolled students to Excel
 *     tags: [Academy Student]
 *     description: Export enrolled students data to Excel format with filtering options. Supports filtering by center, batch, status, and date range. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD) - filters bookings by creation date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD) - filters bookings by creation date
 *     responses:
 *       200:
 *         description: Excel file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get('/export/excel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), studentController.exportToExcel);
/**
 * @swagger
 * /academy/my-student/export/pdf:
 *   get:
 *     summary: Export enrolled students to PDF
 *     tags: [Academy Student]
 *     description: Export enrolled students data to PDF format with filtering options. Supports filtering by center, batch, status, and date range. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD) - filters bookings by creation date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD) - filters bookings by creation date
 *     responses:
 *       200:
 *         description: PDF file downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get('/export/pdf', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), studentController.exportToPDF);
/**
 * @swagger
 * /academy/my-student/export/csv:
 *   get:
 *     summary: Export enrolled students to CSV
 *     tags: [Academy Student]
 *     description: Export enrolled students data to CSV format with filtering options. Supports filtering by center, batch, status, and date range. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD) - filters bookings by creation date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD) - filters bookings by creation date
 *     responses:
 *       200:
 *         description: CSV file downloaded successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get('/export/csv', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), studentController.exportToCSV);
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
router.get('/:participantId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), studentController.getEnrolledStudentDetail);
exports.default = router;
//# sourceMappingURL=student.routes.js.map