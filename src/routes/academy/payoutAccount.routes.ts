import { Router } from 'express';
import * as payoutAccountController from '../../controllers/academy/payoutAccount.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  createPayoutAccountSchema,
  updateBankDetailsSchema,
} from '../../validations/payoutAccount.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

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
router.get(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  payoutAccountController.getPayoutAccount
);

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
 *       - Legal business name
 *       - Business type (individual, partnership, private_limited, etc.)
 *       - Contact name, email, and phone
 *       - PAN (required)
 *       - GST (optional)
 *       - Registered address
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
router.post(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(createPayoutAccountSchema),
  payoutAccountController.createPayoutAccount
);

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
router.put(
  '/bank-details',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(updateBankDetailsSchema),
  payoutAccountController.updateBankDetails
);

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
router.post(
  '/sync-status',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  payoutAccountController.syncAccountStatus
);

export default router;
