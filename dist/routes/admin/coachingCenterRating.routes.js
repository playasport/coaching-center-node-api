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
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const coachingCenterRatingController = __importStar(require("../../controllers/admin/coachingCenterRating.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
/**
 * @swagger
 * /admin/ratings:
 *   get:
 *     summary: Get paginated coaching center ratings (admin)
 *     tags: [Admin Ratings]
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
 *       - in: query
 *         name: coachingCenterId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings list with pagination
 */
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.COACHING_CENTER_RATINGS, section_enum_1.Action.VIEW), coachingCenterRatingController.getRatings);
/**
 * @swagger
 * /admin/ratings/{id}:
 *   get:
 *     summary: Get a single rating by id (admin)
 *     tags: [Admin Ratings]
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
 *         description: Rating details
 *       404:
 *         description: Rating not found
 */
router.get('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.COACHING_CENTER_RATINGS, section_enum_1.Action.VIEW), coachingCenterRatingController.getRatingById);
/**
 * @swagger
 * /admin/ratings/{id}/status:
 *   patch:
 *     summary: Update rating status (approve / reject / pending)
 *     tags: [Admin Ratings]
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
router.patch('/:id/status', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.COACHING_CENTER_RATINGS, section_enum_1.Action.UPDATE), coachingCenterRatingController.updateRatingStatus);
exports.default = router;
//# sourceMappingURL=coachingCenterRating.routes.js.map