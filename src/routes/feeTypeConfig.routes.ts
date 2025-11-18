import { Router } from 'express';
import * as feeTypeConfigController from '../controllers/feeTypeConfig.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { DefaultRoles } from '../enums/defaultRoles.enum';

const router = Router();

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
router.get(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  feeTypeConfigController.getAllFeeTypesHandler
);

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
router.get(
  '/:feeType',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  feeTypeConfigController.getFeeTypeFormStructure
);

export default router;

