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
const sportController = __importStar(require("../controllers/sport.controller"));
const facilityController = __importStar(require("../controllers/facility.controller"));
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=basic.routes.js.map