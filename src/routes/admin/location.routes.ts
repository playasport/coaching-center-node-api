import { Router } from 'express';
import * as adminLocationController from '../../controllers/admin/location.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validation.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import {
  createCountrySchema,
  updateCountrySchema,
  getCountriesQuerySchema,
  createStateSchema,
  updateStateSchema,
  getStatesQuerySchema,
  createCitySchema,
  updateCitySchema,
  getCitiesQuerySchema,
} from '../../validations/location.validation';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== COUNTRY ROUTES ====================

/**
 * @swagger
 * /admin/locations/countries:
 *   get:
 *     summary: Get all countries for admin
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve paginated list of all countries with filters and search. Requires location:view permission.
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
 *         description: Search by name, code, iso2, or iso3
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *       - in: query
 *         name: subregion
 *         schema:
 *           type: string
 *         description: Filter by subregion
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: name
 *         description: Field to sort by (name, code, createdAt, updatedAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Countries retrieved successfully
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
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create new country
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new country. Requires location:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCountryRequest'
 *     responses:
 *       201:
 *         description: Country created successfully
 *       400:
 *         description: Bad request - validation error or country already exists
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/countries',
  requirePermission(Section.LOCATION, Action.VIEW),
  validate(getCountriesQuerySchema),
  adminLocationController.getAllCountries
);

router.post(
  '/countries',
  requirePermission(Section.LOCATION, Action.CREATE),
  validate(createCountrySchema),
  adminLocationController.createCountry
);

/**
 * @swagger
 * /admin/locations/countries/{id}:
 *   get:
 *     summary: Get country by ID (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific country by ID. Supports MongoDB ObjectId, code, iso2, or iso3. Requires location:view permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID (ObjectId, code, iso2, or iso3)
 *     responses:
 *       200:
 *         description: Country retrieved successfully
 *       404:
 *         description: Country not found
 *   patch:
 *     summary: Update country (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Update a country. All fields are optional. Requires location:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID (ObjectId, code, iso2, or iso3)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCountryRequest'
 *     responses:
 *       200:
 *         description: Country updated successfully
 *       400:
 *         description: Bad request - validation error or country already exists
 *       404:
 *         description: Country not found
 *   delete:
 *     summary: Delete country (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a country. Cannot delete if country has associated states. Requires location:delete permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID (ObjectId, code, iso2, or iso3)
 *     responses:
 *       200:
 *         description: Country deleted successfully
 *       400:
 *         description: Cannot delete country with associated states
 *       404:
 *         description: Country not found
 */
router.get(
  '/countries/:id',
  requirePermission(Section.LOCATION, Action.VIEW),
  adminLocationController.getCountryById
);

router.patch(
  '/countries/:id',
  requirePermission(Section.LOCATION, Action.UPDATE),
  validate(updateCountrySchema),
  adminLocationController.updateCountry
);

router.delete(
  '/countries/:id',
  requirePermission(Section.LOCATION, Action.DELETE),
  adminLocationController.deleteCountry
);

// ==================== STATE ROUTES ====================

/**
 * @swagger
 * /admin/locations/states:
 *   get:
 *     summary: Get all states for admin
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve paginated list of all states with filters and search. Requires location:view permission.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, stateCode, or countryName
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *         description: Filter by country ID
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: Filter by country code
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: name
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: States retrieved successfully
 *   post:
 *     summary: Create new state
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new state. Requires location:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStateRequest'
 *     responses:
 *       201:
 *         description: State created successfully
 *       400:
 *         description: Bad request - validation error or state already exists
 */
router.get(
  '/states',
  requirePermission(Section.LOCATION, Action.VIEW),
  validate(getStatesQuerySchema),
  adminLocationController.getAllStates
);

router.post(
  '/states',
  requirePermission(Section.LOCATION, Action.CREATE),
  validate(createStateSchema),
  adminLocationController.createState
);

/**
 * @swagger
 * /admin/locations/states/{id}:
 *   get:
 *     summary: Get state by ID (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific state by ID. Supports MongoDB ObjectId or stateCode. Requires location:view permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: State ID (ObjectId or stateCode)
 *     responses:
 *       200:
 *         description: State retrieved successfully
 *       404:
 *         description: State not found
 *   patch:
 *     summary: Update state (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Update a state. All fields are optional. Requires location:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: State ID (ObjectId or stateCode)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStateRequest'
 *     responses:
 *       200:
 *         description: State updated successfully
 *       400:
 *         description: Bad request - validation error or state already exists
 *       404:
 *         description: State not found
 *   delete:
 *     summary: Delete state (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a state. Cannot delete if state has associated cities. Requires location:delete permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: State ID (ObjectId or stateCode)
 *     responses:
 *       200:
 *         description: State deleted successfully
 *       400:
 *         description: Cannot delete state with associated cities
 *       404:
 *         description: State not found
 */
router.get(
  '/states/:id',
  requirePermission(Section.LOCATION, Action.VIEW),
  adminLocationController.getStateById
);

router.patch(
  '/states/:id',
  requirePermission(Section.LOCATION, Action.UPDATE),
  validate(updateStateSchema),
  adminLocationController.updateState
);

router.delete(
  '/states/:id',
  requirePermission(Section.LOCATION, Action.DELETE),
  adminLocationController.deleteState
);

// ==================== CITY ROUTES ====================

/**
 * @swagger
 * /admin/locations/cities:
 *   get:
 *     summary: Get all cities for admin
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve paginated list of all cities with filters and search. Requires location:view permission.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, stateName, or countryName
 *       - in: query
 *         name: stateId
 *         schema:
 *           type: string
 *         description: Filter by state ID
 *       - in: query
 *         name: stateName
 *         schema:
 *           type: string
 *         description: Filter by state name
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *         description: Filter by country ID
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: Filter by country code
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: name
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
 *   post:
 *     summary: Create new city
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new city. Requires location:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCityRequest'
 *     responses:
 *       201:
 *         description: City created successfully
 *       400:
 *         description: Bad request - validation error or city already exists
 */
router.get(
  '/cities',
  requirePermission(Section.LOCATION, Action.VIEW),
  validate(getCitiesQuerySchema),
  adminLocationController.getAllCities
);

router.post(
  '/cities',
  requirePermission(Section.LOCATION, Action.CREATE),
  validate(createCitySchema),
  adminLocationController.createCity
);

/**
 * @swagger
 * /admin/locations/cities/{id}:
 *   get:
 *     summary: Get city by ID (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific city by ID. Supports MongoDB ObjectId or city name. Requires location:view permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID (ObjectId or city name)
 *     responses:
 *       200:
 *         description: City retrieved successfully
 *       404:
 *         description: City not found
 *   patch:
 *     summary: Update city (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Update a city. All fields are optional. Requires location:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID (ObjectId or city name)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCityRequest'
 *     responses:
 *       200:
 *         description: City updated successfully
 *       400:
 *         description: Bad request - validation error or city already exists
 *       404:
 *         description: City not found
 *   delete:
 *     summary: Delete city (admin)
 *     tags: [Admin Locations]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a city. Requires location:delete permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID (ObjectId or city name)
 *     responses:
 *       200:
 *         description: City deleted successfully
 *       404:
 *         description: City not found
 */
router.get(
  '/cities/:id',
  requirePermission(Section.LOCATION, Action.VIEW),
  adminLocationController.getCityById
);

router.patch(
  '/cities/:id',
  requirePermission(Section.LOCATION, Action.UPDATE),
  validate(updateCitySchema),
  adminLocationController.updateCity
);

router.delete(
  '/cities/:id',
  requirePermission(Section.LOCATION, Action.DELETE),
  adminLocationController.deleteCity
);

export default router;

