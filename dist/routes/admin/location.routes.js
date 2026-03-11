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
const adminLocationController = __importStar(require("../../controllers/admin/location.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const location_validation_1 = require("../../validations/location.validation");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
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
router.get('/countries', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(location_validation_1.getCountriesQuerySchema), adminLocationController.getAllCountries);
router.post('/countries', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(location_validation_1.createCountrySchema), adminLocationController.createCountry);
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
router.get('/countries/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), adminLocationController.getCountryById);
router.patch('/countries/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.UPDATE), (0, validation_middleware_1.validate)(location_validation_1.updateCountrySchema), adminLocationController.updateCountry);
router.delete('/countries/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.DELETE), adminLocationController.deleteCountry);
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
router.get('/states', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(location_validation_1.getStatesQuerySchema), adminLocationController.getAllStates);
router.post('/states', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(location_validation_1.createStateSchema), adminLocationController.createState);
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
router.get('/states/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), adminLocationController.getStateById);
router.patch('/states/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.UPDATE), (0, validation_middleware_1.validate)(location_validation_1.updateStateSchema), adminLocationController.updateState);
router.delete('/states/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.DELETE), adminLocationController.deleteState);
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
router.get('/cities', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(location_validation_1.getCitiesQuerySchema), adminLocationController.getAllCities);
router.post('/cities', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(location_validation_1.createCitySchema), adminLocationController.createCity);
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
router.get('/cities/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.VIEW), adminLocationController.getCityById);
router.patch('/cities/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.UPDATE), (0, validation_middleware_1.validate)(location_validation_1.updateCitySchema), adminLocationController.updateCity);
router.delete('/cities/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.LOCATION, section_enum_2.Action.DELETE), adminLocationController.deleteCity);
exports.default = router;
//# sourceMappingURL=location.routes.js.map