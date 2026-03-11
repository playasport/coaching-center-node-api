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
const sportController = __importStar(require("../../controllers/admin/sport.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const sport_validation_1 = require("../../validations/sport.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const sportUpload_middleware_1 = require("../../middleware/sportUpload.middleware");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
/**
 * @swagger
 * /admin/sports:
 *   get:
 *     summary: Get all sports for admin
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Successfully retrieved sports
 *   post:
 *     summary: Create a new sport
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new sport. Supports two methods:
 *       1. JSON with logo URL: Send application/json with logo URL string
 *       2. Multipart with image file: Send multipart/form-data with image file (automatically uploads to S3)
 *
 *       **Image Upload:**
 *       - Images are automatically resized if width exceeds 1500px (maintains aspect ratio)
 *       - Images are automatically compressed to optimize file size (target: 500KB max)
 *       - Filename format: images/sports/{sport-slug}.{extension} (e.g., images/sports/cricket.jpg)
 *       - New uploads automatically replace old images with the same sport name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SportCreate'
 *           example:
 *             name: "Cricket"
 *             logo: "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg"
 *             is_active: true
 *             is_popular: false
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Cricket"
 *                 description: "Sport name (1-100 characters)"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: |
 *                   Sport logo/image file (JPEG, PNG, WebP) - max 5MB
 *                   Images are automatically resized and compressed
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               is_popular:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *     responses:
 *       201:
 *         description: Sport created successfully
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
 *                   example: "Sport created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sport:
 *                       $ref: '#/components/schemas/PopularSport'
 *
 * /admin/sports/{id}:
 *   get:
 *     summary: Get sport by ID
 *     tags: [Admin Sports]
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
 *         description: Successfully retrieved sport
 *   patch:
 *     summary: Update a sport
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update an existing sport. Supports two methods:
 *       1. JSON with logo URL: Send application/json with logo URL string
 *       2. Multipart with image file: Send multipart/form-data with image file (automatically uploads to S3)
 *
 *       **Image Upload:**
 *       - Images are automatically resized if width exceeds 1500px (maintains aspect ratio)
 *       - Images are automatically compressed to optimize file size (target: 500KB max)
 *       - Filename format: images/sports/{sport-slug}.{extension} (e.g., images/sports/cricket.jpg)
 *       - New uploads automatically replace old images with the same sport name
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sport ID (MongoDB ObjectId or custom_id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SportUpdate'
 *           example:
 *             name: "Cricket Updated"
 *             logo: "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg"
 *             is_active: true
 *             is_popular: true
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Cricket Updated"
 *                 description: "Sport name (1-100 characters)"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: |
 *                   Sport logo/image file (JPEG, PNG, WebP) - max 5MB
 *                   Images are automatically resized and compressed
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               is_popular:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Sport updated successfully
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
 *                   example: "Sport updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sport:
 *                       $ref: '#/components/schemas/PopularSport'
 *   delete:
 *     summary: Delete a sport
 *     tags: [Admin Sports]
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
 *         description: Sport deleted successfully
 */
/**
 * @swagger
 * /admin/sports/export/excel:
 *   get:
 *     summary: Export sports to Excel
 *     description: Export all sports data to Excel format with optional filtering. Requires admin authentication.
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by sport name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by active status
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by popular status
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/export/excel', sportController.exportToExcel);
/**
 * @swagger
 * /admin/sports/export/pdf:
 *   get:
 *     summary: Export sports to PDF
 *     description: Export all sports data to PDF format with optional filtering. Requires admin authentication.
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by sport name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by active status
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by popular status
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/export/pdf', sportController.exportToPDF);
/**
 * @swagger
 * /admin/sports/export/csv:
 *   get:
 *     summary: Export sports to CSV
 *     description: Export all sports data to CSV format with optional filtering. Requires admin authentication.
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by sport name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by active status
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by popular status
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/export/csv', sportController.exportToCSV);
router.get('/', sportController.getAllSports);
router.get('/:id', sportController.getSportById);
// Create sport - supports both JSON (with logo URL) and multipart/form-data (with image file)
router.post('/', sportUpload_middleware_1.uploadSportImage, (0, validation_middleware_1.validate)(sport_validation_1.createSportSchema), sportController.createSport);
// Update sport - supports both JSON (with logo URL) and multipart/form-data (with image file)
router.patch('/:id', sportUpload_middleware_1.uploadSportImage, (0, validation_middleware_1.validate)(sport_validation_1.updateSportSchema), sportController.updateSport);
router.delete('/:id', sportController.deleteSport);
/**
 * @swagger
 * /admin/sports/{id}/toggle-active:
 *   patch:
 *     summary: Toggle sport active status
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sport ID (MongoDB ObjectId or custom_id)
 *     responses:
 *       200:
 *         description: Sport active status toggled successfully
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
 *                   example: "Sport activated successfully or Sport deactivated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sport:
 *                       $ref: '#/components/schemas/PopularSport'
 *       404:
 *         description: Sport not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/toggle-active', sportController.toggleSportActiveStatus);
/**
 * @swagger
 * /admin/sports/{id}/image:
 *   delete:
 *     summary: Delete sport image
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sport ID (MongoDB ObjectId or custom_id)
 *     responses:
 *       200:
 *         description: Sport image deleted successfully
 *       404:
 *         description: Sport or image not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.delete('/:id/image', sportController.deleteSportImage);
exports.default = router;
//# sourceMappingURL=sport.routes.js.map