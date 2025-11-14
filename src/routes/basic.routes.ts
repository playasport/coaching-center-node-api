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
 *     description: Retrieve a list of all active sports with name, logo, is_popular, and custom_id
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
 *     description: Retrieve a list of all active facilities with name, description, icon, and custom_id
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
 */
router.get('/facilities', facilityController.getAllFacilities);

export default router;

