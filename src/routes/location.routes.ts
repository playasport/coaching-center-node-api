import { Router } from 'express';
import * as locationController from '../controllers/location.controller';

const router = Router();

/**
 * @swagger
 * /location/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Location]
 *     description: Retrieve a list of all countries
 *     responses:
 *       200:
 *         description: List of countries retrieved successfully
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
 *                   example: "Countries retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Country'
 */
router.get('/countries', locationController.getCountries);

/**
 * @swagger
 * /location/states:
 *   get:
 *     summary: Get states by country
 *     tags: [Location]
 *     description: Retrieve a list of states for a specific country
 *     parameters:
 *       - in: query
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Country code (ISO2) or country ID
 *         example: "IN"
 *     responses:
 *       200:
 *         description: List of states retrieved successfully
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
 *                   example: "States retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     states:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/State'
 *       400:
 *         description: Country code is required
 */
router.get('/states', locationController.getStates);

/**
 * @swagger
 * /location/cities:
 *   get:
 *     summary: Get cities by state
 *     tags: [Location]
 *     description: Retrieve a list of cities for a specific state
 *     parameters:
 *       - in: query
 *         name: stateName
 *         required: false
 *         schema:
 *           type: string
 *         description: State name
 *         example: "Delhi"
 *       - in: query
 *         name: stateId
 *         required: false
 *         schema:
 *           type: string
 *         description: State ID
 *         example: "state-id-123"
 *       - in: query
 *         name: countryCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Country code (optional, for filtering)
 *         example: "IN"
 *     responses:
 *       200:
 *         description: List of cities retrieved successfully
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
 *                   example: "Cities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/City'
 *       400:
 *         description: State name or state ID is required
 */
router.get('/cities', locationController.getCities);

export default router;

