import { Router } from 'express';
import * as feeTypeConfigController from '../../controllers/admin/feeTypeConfig.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/fee-type-config:
 *   get:
 *     summary: Get all available fee types (admin)
 *     description: Retrieve all available fee types with their labels and descriptions. Requires authentication and admin role.
 *     tags: [Admin Fee Type Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fee types retrieved successfully
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
 *                   example: "Fee types retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     feeTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           value:
 *                             type: string
 *                             example: "monthly"
 *                           label:
 *                             type: string
 *                             example: "Monthly Fee"
 *                           description:
 *                             type: string
 *                             example: "Fee charged on a monthly basis"
 *             example:
 *               success: true
 *               message: "Fee types retrieved successfully"
 *               data:
 *                 feeTypes:
 *                   - value: "monthly"
 *                     label: "Monthly Fee"
 *                     description: "Fee charged on a monthly basis"
 *                   - value: "daily"
 *                     label: "Daily Fee"
 *                     description: "Fee charged per day"
 *                   - value: "weekly"
 *                     label: "Weekly Fee"
 *                     description: "Fee charged on a weekly basis"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/',
  requirePermission(Section.BATCH, Action.VIEW),
  feeTypeConfigController.getAllFeeTypesHandler
);

/**
 * @swagger
 * /admin/fee-type-config/{feeType}:
 *   get:
 *     summary: Get form structure for a specific fee type (admin)
 *     description: Retrieve the form structure (fields) required for a specific fee type. This helps in building dynamic forms. Requires authentication and admin role.
 *     tags: [Admin Fee Type Configuration]
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
 *         example: "monthly"
 *     responses:
 *       200:
 *         description: Fee type form structure retrieved successfully
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
 *                   example: "Fee type form structure retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     config:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         fee_type:
 *                           type: string
 *                           example: "monthly"
 *                         label:
 *                           type: string
 *                           example: "Monthly Fee"
 *                         description:
 *                           type: string
 *                           example: "Fee charged on a monthly basis"
 *                         formFields:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "base_price"
 *                               label:
 *                                 type: string
 *                                 example: "Base Price"
 *                               type:
 *                                 type: string
 *                                 example: "number"
 *                               required:
 *                                 type: boolean
 *                                 example: true
 *                               placeholder:
 *                                 type: string
 *                                 example: "Enter base price"
 *                               min:
 *                                 type: number
 *                                 example: 0
 *                               max:
 *                                 type: number
 *                                 example: null
 *                               step:
 *                                 type: number
 *                                 example: 0.01
 *                               options:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                               fields:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                               description:
 *                                 type: string
 *             example:
 *               success: true
 *               message: "Fee type form structure retrieved successfully"
 *               data:
 *                 config:
 *                   id: "507f1f77bcf86cd799439011"
 *                   fee_type: "monthly"
 *                   label: "Monthly Fee"
 *                   description: "Fee charged on a monthly basis"
 *                   formFields:
 *                     - name: "base_price"
 *                       label: "Base Price"
 *                       type: "number"
 *                       required: true
 *                       placeholder: "Enter base price"
 *                       min: 0
 *                       step: 0.01
 *                       description: "Base monthly fee amount"
 *                     - name: "classes_per_week_options"
 *                       label: "Classes Per Week Options"
 *                       type: "array"
 *                       required: false
 *                       description: "Different pricing options based on classes per week"
 *                       fields:
 *                         - name: "days_per_week"
 *                           label: "Days Per Week"
 *                           type: "number"
 *                           required: true
 *                           min: 1
 *                           max: 7
 *                         - name: "price"
 *                           label: "Price"
 *                           type: "number"
 *                           required: true
 *                           min: 0
 *                           step: 0.01
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Fee type not found
 */
router.get(
  '/:feeType',
  requirePermission(Section.BATCH, Action.VIEW),
  feeTypeConfigController.getFeeTypeFormStructure
);

export default router;

