import { Router } from 'express';
import * as sportController from '../controllers/sport.controller';
import * as facilityController from '../controllers/facility.controller';

const router = Router();

/**
 * @swagger
 * /sports:
 *   get:
 *     summary: Get all active sports
 *     tags: [Basic]
 *     description: Retrieve a list of all active sports with id, name, logo, and is_popular
 *     responses:
 *       200:
 *         description: List of sports retrieved successfully
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
 *                   example: "Sports retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SportListItem'
 */
router.get('/sports', sportController.getAllSports);

/**
 * @swagger
 * /facilities:
 *   get:
 *     summary: Get all active facilities
 *     tags: [Basic]
 *     description: |
 *       Retrieve a list of all active facilities with name, description, icon, and custom_id.
 *       Results are sorted by newest first (createdAt descending).
 *       
 *       **Features:**
 *       - Returns only active facilities (is_active: true)
 *       - Excludes soft-deleted facilities
 *       - Sorted by creation date (newest first)
 *       - Optional search functionality
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: |
 *           Search by name, description, or custom_id (case-insensitive).
 *           Searches across all three fields using OR logic.
 *         example: "swimming"
 *     responses:
 *       200:
 *         description: List of facilities retrieved successfully
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
 *                         $ref: '#/components/schemas/FacilityListItem'
 *             examples:
 *               allFacilities:
 *                 summary: All facilities (newest first)
 *                 value:
 *                   success: true
 *                   message: "Facilities retrieved successfully"
 *                   data:
 *                     facilities:
 *                       - _id: "507f1f77bcf86cd799439012"
 *                         custom_id: "550e8400-e29b-41d4-a716-446655440001"
 *                         name: "Gymnasium"
 *                         description: "Modern gym with latest equipment"
 *                         icon: "https://example.com/icons/gym.png"
 *                       - _id: "507f1f77bcf86cd799439011"
 *                         custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                         name: "Swimming Pool"
 *                         description: "Olympic size swimming pool"
 *                         icon: "https://example.com/icons/swimming.png"
 *               searchResults:
 *                 summary: Search results (search=pool)
 *                 value:
 *                   success: true
 *                   message: "Facilities retrieved successfully"
 *                   data:
 *                     facilities:
 *                       - _id: "507f1f77bcf86cd799439011"
 *                         custom_id: "550e8400-e29b-41d4-a716-446655440000"
 *                         name: "Swimming Pool"
 *                         description: "Olympic size swimming pool"
 *                         icon: "https://example.com/icons/swimming.png"
 */
router.get('/facilities', facilityController.getAllFacilities);

export default router;

