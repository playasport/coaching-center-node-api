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
const locationController = __importStar(require("../controllers/location.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas for public location routes
const getStatesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        countryCode: zod_1.z.string().min(1, 'Country code is required').max(50, 'Country code is too long'),
    }),
});
const getCitiesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        stateId: zod_1.z.string().min(1, 'State ID is required').max(100, 'State ID is too long'),
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
router.get('/states', (0, validation_middleware_1.validate)(getStatesQuerySchema), locationController.getStates);
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
router.get('/cities', (0, validation_middleware_1.validate)(getCitiesQuerySchema), locationController.getCities);
exports.default = router;
//# sourceMappingURL=location.routes.js.map