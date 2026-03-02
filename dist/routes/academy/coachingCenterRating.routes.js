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
const auth_middleware_1 = require("../../middleware/auth.middleware");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const coachingCenterRatingController = __importStar(require("../../controllers/academy/coachingCenterRating.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY));
/**
 * @swagger
 * /academy/ratings:
 *   get:
 *     summary: List ratings for academy's coaching centers
 *     tags: [Academy Ratings]
 *     description: Get a paginated list of ratings for coaching centers owned by the authenticated academy. Optional filters by status and coachingCenterId.
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
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by rating status
 *       - in: query
 *         name: coachingCenterId
 *         schema:
 *           type: string
 *         description: Filter by one of your coaching center IDs
 *     responses:
 *       200:
 *         description: Ratings list with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not academy role)
 */
router.get('/', coachingCenterRatingController.getRatings);
/**
 * @swagger
 * /academy/ratings/{id}:
 *   get:
 *     summary: Get a single rating by id
 *     tags: [Academy Ratings]
 *     description: Get one rating. Only returns the rating if it belongs to one of the academy's coaching centers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating document ID (MongoDB _id)
 *     responses:
 *       200:
 *         description: Rating details
 *       404:
 *         description: Rating not found
 */
router.get('/:id', coachingCenterRatingController.getRatingById);
/**
 * @swagger
 * /academy/ratings/{id}/status:
 *   patch:
 *     summary: Update rating status (approve / reject / pending)
 *     tags: [Academy Ratings]
 *     description: Set a rating's status. Only allowed for ratings belonging to the academy's coaching centers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *     responses:
 *       200:
 *         description: Rating status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Rating not found
 */
router.patch('/:id/status', coachingCenterRatingController.updateRatingStatus);
exports.default = router;
//# sourceMappingURL=coachingCenterRating.routes.js.map