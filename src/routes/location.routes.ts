import { Router } from 'express';
import * as locationController from '../controllers/location.controller';
import { generalRateLimit } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas for public location routes
const getStatesQuerySchema = z.object({
  query: z.object({
    countryCode: z.string().min(1, 'Country code is required').max(50, 'Country code is too long'),
  }),
});

const getCitiesQuerySchema = z.object({
  query: z.object({
    stateId: z.string().min(1, 'State ID is required').max(100, 'State ID is too long'),
  }),
});

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
router.get('/countries', generalRateLimit, locationController.getCountries);

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
router.get('/states', generalRateLimit, validate(getStatesQuerySchema), locationController.getStates);

/**
 * @swagger
 * /location/cities:
 *   get:
 *     summary: Get cities by state ID
 *     tags: [Location]
 *     description: Retrieve a list of cities for a specific state using state ID (MongoDB ObjectId or state reference ID)
 *     parameters:
 *       - in: query
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *         description: State ID (MongoDB ObjectId or state reference ID)
 *         example: "694119952301f6a1798b1300"
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
 *         description: State ID is required
 */
router.get('/cities', generalRateLimit, validate(getCitiesQuerySchema), locationController.getCities);

export default router;

