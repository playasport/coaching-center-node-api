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
const feeTypeConfigController = __importStar(require("../../controllers/academy/feeTypeConfig.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/fee-type-config:
 *   get:
 *     summary: Get all available fee types
 *     tags: [Fee Type]
 *     description: Retrieve all available fee types with their labels and descriptions. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fee types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeeTypesResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), feeTypeConfigController.getAllFeeTypesHandler);
/**
 * @swagger
 * /academy/fee-type-config/{feeType}:
 *   get:
 *     summary: Get form structure for a specific fee type
 *     tags: [Fee Type]
 *     description: Retrieve the form structure (fields) required for a specific fee type. This helps in building dynamic forms. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feeType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, daily, weekly, hourly, per_batch, per_session, age_based, coach_license_based, player_level_based, seasonal, package_based, group_discount, advance_booking, weekend_pricing, peak_hours, membership_based, custom]
 *         description: Fee type
 *     responses:
 *       200:
 *         description: Fee type form structure retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeeTypeConfigResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Fee type not found
 */
router.get('/:feeType', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), feeTypeConfigController.getFeeTypeFormStructure);
exports.default = router;
//# sourceMappingURL=feeTypeConfig.routes.js.map