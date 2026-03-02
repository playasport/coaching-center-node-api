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
const payoutAccountController = __importStar(require("../../controllers/academy/payoutAccount.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const payoutAccount_validation_1 = require("../../validations/payoutAccount.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/payout-account:
 *   get:
 *     summary: Get payout account for authenticated academy user
 *     tags: [Academy Payout Account]
 *     description: Retrieve the payout account details for the authenticated academy user. Each academy user can have only one payout account.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout account retrieved successfully
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
 *                   example: "Payout account retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyPayoutAccount'
 *       404:
 *         description: Payout account not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), payoutAccountController.getPayoutAccount);
/**
 * @swagger
 * /academy/payout-account:
 *   post:
 *     summary: Create payout account for authenticated academy user
 *     tags: [Academy Payout Account]
 *     description: |
 *       Create a new payout account (Linked Account) in Razorpay Route for the authenticated academy user.
 *       This will:
 *       1. Create a Linked Account in Razorpay with KYC details
 *       2. Create a stakeholder (if provided)
 *       3. Request Route product configuration
 *       4. Store the account details in the database
 *
 *       **Important:** Each academy user can create only one payout account.
 *
     *       **KYC Requirements:**
     *       - Legal business name (1-100 characters)
     *       - Business type: `individual` (currently only individual is supported)
     *       - Contact name, email, and phone
     *       - PAN (required - format: ABCDE1234F)
     *       - GST (optional)
     *       - Registered address (street1 max 100 chars, street2 max 100 chars)
 *
 *       **Bank Details:**
 *       - Can be provided during creation or updated later
 *       - Account number, IFSC code, account holder name, and bank name
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayoutAccountRequest'
 *     responses:
 *       201:
 *         description: Payout account created successfully
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
 *                   example: "Payout account created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyPayoutAccount'
 *       400:
 *         description: Validation error or account already exists
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Internal server error or Razorpay API error
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(payoutAccount_validation_1.createPayoutAccountSchema), payoutAccountController.createPayoutAccount);
/**
 * @swagger
 * /academy/payout-account/bank-details:
 *   put:
 *     summary: Update bank details for payout account
 *     tags: [Academy Payout Account]
 *     description: |
 *       Update bank account details for the payout account.
 *       This will update the bank details in Razorpay Route and in the database.
 *       The bank details will be verified by Razorpay.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBankDetailsRequest'
 *     responses:
 *       200:
 *         description: Bank details updated successfully
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
 *                   example: "Bank details updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyPayoutAccount'
 *       404:
 *         description: Payout account not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Internal server error or Razorpay API error
 */
router.put('/bank-details', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), (0, validation_middleware_1.validate)(payoutAccount_validation_1.updateBankDetailsSchema), payoutAccountController.updateBankDetails);
/**
 * @swagger
 * /academy/payout-account/sync-status:
 *   post:
 *     summary: Sync account status from Razorpay
 *     tags: [Academy Payout Account]
 *     description: |
 *       Manually sync the payout account status from Razorpay.
 *       This will fetch the latest status from Razorpay and update the database.
 *       Notifications will be sent if the status has changed.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account status synced successfully
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
 *                   example: "Account status synced successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyPayoutAccount'
 *       404:
 *         description: Payout account not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Internal server error or Razorpay API error
 */
router.post('/sync-status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), payoutAccountController.syncAccountStatus);
exports.default = router;
//# sourceMappingURL=payoutAccount.routes.js.map