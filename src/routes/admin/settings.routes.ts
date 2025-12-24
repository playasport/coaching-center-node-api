import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section, Action } from '../../enums/section.enum';
import * as settingsController from '../../controllers/admin/settings.controller';
import { uploadSettingsLogo } from '../../middleware/settingsUpload.middleware';

const router = Router();

// All admin settings routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get all settings (admin only - includes sensitive data)
 *     description: Retrieve all application settings including sensitive data (decrypted). Public endpoint excludes sensitive fields. Requires settings:view permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
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
 *                   example: "Settings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *             example:
 *               success: true
 *               message: "Settings retrieved successfully"
 *               data:
 *                 settings:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   app_name: "Play A Sport"
 *                   app_logo: "https://example.com/logo.png"
 *                   contact:
 *                     number: ["+91-9876543210"]
 *                     email: "contact@playasport.in"
 *                     address:
 *                       office: "123 Main Street, Kolkata"
 *                       registered: "456 Corporate Avenue, Mumbai"
 *                     whatsapp: "+91-9876543210"
 *                     instagram: "https://instagram.com/playasport"
 *                     facebook: "https://facebook.com/playasport"
 *                     youtube: "https://youtube.com/playasport"
 *                   basic_info:
 *                     about_us: "About our platform..."
 *                     support_email: "support@playasport.in"
 *                     support_phone: "+91-9876543210"
 *                     meta_description: "Meta description for SEO"
 *                     meta_keywords: "sports, coaching, academy"
 *                   fees:
 *                     platform_fee: 200
 *                     gst_percentage: 18
 *                     gst_enabled: true
 *                     currency: "INR"
 *                   notifications:
 *                     enabled: true
 *                     sms:
 *                       enabled: true
 *                       provider: "twilio"
 *                       api_key: "decrypted-api-key"
 *                       api_secret: "decrypted-api-secret"
 *                       from_number: "+1234567890"
 *                     email:
 *                       enabled: true
 *                       host: "smtp.gmail.com"
 *                       port: 587
 *                       username: "decrypted-username"
 *                       password: "decrypted-password"
 *                       from: "noreply@playasport.in"
 *                       from_name: "PlayAsport"
 *                       secure: false
 *                     whatsapp:
 *                       enabled: true
 *                       provider: "twilio"
 *                       account_sid: "decrypted-account-sid"
 *                       auth_token: "decrypted-auth-token"
 *                       from_number: "+1234567890"
 *                     push:
 *                       enabled: true
 *                   payment:
 *                     enabled: true
 *                     gateway: "razorpay"
 *                     razorpay:
 *                       key_id: "decrypted-key-id"
 *                       key_secret: "decrypted-key-secret"
 *                       enabled: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', requirePermission(Section.SETTINGS, Action.VIEW), settingsController.getSettings);

/**
 * @swagger
 * /admin/settings:
 *   put:
 *     summary: Update settings (admin only)
 *     description: Update any settings fields. Supports partial updates. Sensitive fields (API keys, passwords, credentials) are automatically encrypted before storage. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               app_name:
 *                 type: string
 *                 nullable: true
 *                 example: "Play A Sport"
 *               app_logo:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: "https://example.com/logo.png"
 *               contact:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   number:
 *                     type: array
 *                     items:
 *                       type: string
 *                     nullable: true
 *                     example: ["+91-9876543210"]
 *                   email:
 *                     type: string
 *                     format: email
 *                     nullable: true
 *                     example: "contact@playasport.in"
 *                   address:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       office:
 *                         type: string
 *                         nullable: true
 *                         example: "123 Main Street, Kolkata"
 *                       registered:
 *                         type: string
 *                         nullable: true
 *                         example: "456 Corporate Avenue, Mumbai"
 *               fees:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   platform_fee:
 *                     type: number
 *                     nullable: true
 *                     example: 250
 *                   gst_percentage:
 *                     type: number
 *                     nullable: true
 *                     example: 18
 *                   gst_enabled:
 *                     type: boolean
 *                     nullable: true
 *                     example: true
 *                   currency:
 *                     type: string
 *                     nullable: true
 *                     example: "INR"
 *               notifications:
 *                 type: object
 *                 nullable: true
 *                 description: Notification configuration (sensitive fields will be encrypted)
 *               payment:
 *                 type: object
 *                 nullable: true
 *                 description: Payment configuration (sensitive fields will be encrypted)
 *           example:
 *             app_name: "Play A Sport"
 *             fees:
 *               platform_fee: 250
 *               gst_percentage: 18
 *               gst_enabled: true
 *               currency: "INR"
 *             notifications:
 *               enabled: true
 *               sms:
 *                 enabled: true
 *                 provider: "twilio"
 *                 api_key: "your-api-key"
 *                 api_secret: "your-api-secret"
 *                 from_number: "+1234567890"
 *     responses:
 *       200:
 *         description: Settings updated successfully
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
 *                   example: "Settings updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/', requirePermission(Section.SETTINGS, Action.UPDATE), settingsController.updateSettings);

/**
 * @swagger
 * /admin/settings/basic-info:
 *   patch:
 *     summary: Update basic information
 *     description: Update basic information fields including app name, logo, about us, support details, SEO metadata, and contact information (phone numbers, email, addresses, social media links). All fields are optional. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               app_name:
 *                 type: string
 *                 nullable: true
 *                 example: "Play A Sport"
 *               app_logo:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: "https://example.com/logo.png"
 *               about_us:
 *                 type: string
 *                 nullable: true
 *                 example: "About our platform..."
 *               support_email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: "support@playasport.in"
 *               support_phone:
 *                 type: string
 *                 nullable: true
 *                 example: "+91-9876543210"
 *               meta_description:
 *                 type: string
 *                 nullable: true
 *                 example: "Meta description for SEO"
 *               meta_keywords:
 *                 type: string
 *                 nullable: true
 *                 example: "sports, coaching, academy"
 *               contact:
 *                 type: object
 *                 nullable: true
 *                 description: Contact information including phone numbers, email, addresses, and social media links
 *                 properties:
 *                   number:
 *                     type: array
 *                     items:
 *                       type: string
 *                     nullable: true
 *                     example: ["+91-9876543210", "+91-9876543211"]
 *                     description: Array of contact phone numbers
 *                   email:
 *                     type: string
 *                     format: email
 *                     nullable: true
 *                     example: "contact@playasport.in"
 *                     description: Contact email address
 *                   address:
 *                     type: object
 *                     nullable: true
 *                     description: Contact addresses
 *                     properties:
 *                       office:
 *                         type: string
 *                         nullable: true
 *                         example: "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"
 *                         description: Office address
 *                       registered:
 *                         type: string
 *                         nullable: true
 *                         example: "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
 *                         description: Registered office address
 *                   whatsapp:
 *                     type: string
 *                     nullable: true
 *                     example: "+91-9876543210"
 *                     description: WhatsApp contact number
 *                   instagram:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     example: "https://www.instagram.com/playasport.in/"
 *                     description: Instagram profile URL
 *                   facebook:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     example: "https://www.facebook.com/PlayASportIndia"
 *                     description: Facebook page URL
 *                   youtube:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     example: "https://www.youtube.com/@PlayASport_in"
 *                     description: YouTube channel URL
 *           example:
 *             app_name: "Play A Sport"
 *             app_logo: "https://example.com/logo.png"
 *             about_us: "About our platform..."
 *             support_email: "support@playasport.in"
 *             support_phone: "+91-9876543210"
 *             meta_description: "Meta description for SEO"
 *             meta_keywords: "sports, coaching, academy"
 *             contact:
 *               number: ["+91-9230981848", "+91-9230981845"]
 *               email: "info@playasport.com"
 *               address:
 *                 office: "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"
 *                 registered: "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
 *               whatsapp: "+91-9230981848"
 *               instagram: "https://www.instagram.com/playasport.in/"
 *               facebook: "https://www.facebook.com/PlayASportIndia"
 *               youtube: "https://www.youtube.com/@PlayASport_in"
 *     responses:
 *       200:
 *         description: Basic information updated successfully
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
 *                   example: "Basic information updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/basic-info',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.updateBasicInfo
);

/**
 * @swagger
 * /admin/settings/logo:
 *   post:
 *     summary: Upload app logo
 *     description: Upload a logo image file for the application. The image will be automatically compressed and saved to S3. The logo URL will be automatically updated in settings. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - logo
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (JPEG, PNG, or WebP). Maximum size is based on media.maxImageSize configuration.
 *           encoding:
 *             logo:
 *               contentType: image/jpeg, image/png, image/webp
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
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
 *                   example: "Logo uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     logoUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://bucket.s3.region.amazonaws.com/images/logo/uuid.jpg"
 *                       description: URL of the uploaded logo
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *             example:
 *               success: true
 *               message: "Logo uploaded successfully"
 *               data:
 *                 logoUrl: "https://bucket.s3.region.amazonaws.com/images/logo/uuid.jpg"
 *                 settings:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   app_name: "Play A Sport"
 *                   app_logo: "https://bucket.s3.region.amazonaws.com/images/logo/uuid.jpg"
 *       400:
 *         description: Bad request - Invalid file type or file size exceeds limit
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/logo',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  uploadSettingsLogo,
  settingsController.uploadLogo
);

/**
 * @swagger
 * /admin/settings/fees:
 *   patch:
 *     summary: Update fee configuration
 *     description: Update fee-related settings including platform fee, GST percentage, GST enabled status, and currency. All fields are optional. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform_fee:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 example: 250
 *                 description: Platform fee amount
 *               gst_percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 example: 18
 *                 description: GST percentage (0-100)
 *               gst_enabled:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *                 description: Whether GST is enabled
 *               currency:
 *                 type: string
 *                 nullable: true
 *                 example: "INR"
 *                 description: Currency code (ISO 4217)
 *           example:
 *             platform_fee: 250
 *             gst_percentage: 18
 *             gst_enabled: true
 *             currency: "INR"
 *     responses:
 *       200:
 *         description: Fee configuration updated successfully
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
 *                   example: "Fee configuration updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/fees',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.updateFeeConfig
);

/**
 * @swagger
 * /admin/settings/notifications:
 *   patch:
 *     summary: Update notification configuration
 *     description: Update notification settings including SMS, Email, WhatsApp, and Push notifications. Sensitive fields (API keys, passwords, credentials) are automatically encrypted before storage. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notifications
 *             properties:
 *               notifications:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     nullable: true
 *                     example: true
 *                   sms:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: true
 *                       provider:
 *                         type: string
 *                         nullable: true
 *                         example: "twilio"
 *                       api_key:
 *                         type: string
 *                         nullable: true
 *                         example: "your-api-key"
 *                         description: Will be encrypted before storage
 *                       api_secret:
 *                         type: string
 *                         nullable: true
 *                         example: "your-api-secret"
 *                         description: Will be encrypted before storage
 *                       from_number:
 *                         type: string
 *                         nullable: true
 *                         example: "+1234567890"
 *                       sender_id:
 *                         type: string
 *                         nullable: true
 *                   email:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: true
 *                       host:
 *                         type: string
 *                         nullable: true
 *                         example: "smtp.gmail.com"
 *                       port:
 *                         type: number
 *                         nullable: true
 *                         example: 587
 *                       username:
 *                         type: string
 *                         nullable: true
 *                         example: "your-email@gmail.com"
 *                         description: Will be encrypted before storage
 *                       password:
 *                         type: string
 *                         nullable: true
 *                         example: "your-password"
 *                         description: Will be encrypted before storage
 *                       from:
 *                         type: string
 *                         nullable: true
 *                         example: "noreply@playasport.in"
 *                       from_name:
 *                         type: string
 *                         nullable: true
 *                         example: "PlayAsport"
 *                       secure:
 *                         type: boolean
 *                         nullable: true
 *                         example: false
 *                   whatsapp:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: true
 *                       provider:
 *                         type: string
 *                         nullable: true
 *                         example: "twilio"
 *                       account_sid:
 *                         type: string
 *                         nullable: true
 *                         example: "your-account-sid"
 *                         description: Will be encrypted before storage (for Twilio)
 *                       auth_token:
 *                         type: string
 *                         nullable: true
 *                         example: "your-auth-token"
 *                         description: Will be encrypted before storage (for Twilio)
 *                       from_number:
 *                         type: string
 *                         nullable: true
 *                         example: "+1234567890"
 *                       api_key:
 *                         type: string
 *                         nullable: true
 *                         description: Will be encrypted before storage
 *                       api_secret:
 *                         type: string
 *                         nullable: true
 *                         description: Will be encrypted before storage
 *                   push:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: true
 *           example:
 *             notifications:
 *               enabled: true
 *               sms:
 *                 enabled: true
 *                 provider: "twilio"
 *                 api_key: "your-api-key"
 *                 api_secret: "your-api-secret"
 *                 from_number: "+1234567890"
 *               email:
 *                 enabled: true
 *                 host: "smtp.gmail.com"
 *                 port: 587
 *                 username: "your-email@gmail.com"
 *                 password: "your-password"
 *                 from: "noreply@playasport.in"
 *                 from_name: "PlayAsport"
 *                 secure: false
 *               whatsapp:
 *                 enabled: true
 *                 provider: "twilio"
 *                 account_sid: "your-account-sid"
 *                 auth_token: "your-auth-token"
 *                 from_number: "+1234567890"
 *               push:
 *                 enabled: true
 *     responses:
 *       200:
 *         description: Notification configuration updated successfully
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
 *                   example: "Notification configuration updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/notifications',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.updateNotificationConfig
);

/**
 * @swagger
 * /admin/settings/payment:
 *   patch:
 *     summary: Update payment configuration
 *     description: Update payment gateway settings including gateway selection and credentials. Payment credentials are automatically encrypted before storage. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment
 *             properties:
 *               payment:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     nullable: true
 *                     example: true
 *                     description: Enable or disable payment gateway
 *                   gateway:
 *                     type: string
 *                     enum: [razorpay, stripe, payu, cashfree]
 *                     nullable: true
 *                     example: "razorpay"
 *                     description: Payment gateway provider
 *                   razorpay:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       key_id:
 *                         type: string
 *                         nullable: true
 *                         example: "your-razorpay-key-id"
 *                         description: Will be encrypted before storage
 *                       key_secret:
 *                         type: string
 *                         nullable: true
 *                         example: "your-razorpay-key-secret"
 *                         description: Will be encrypted before storage
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: true
 *                   stripe:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       api_key:
 *                         type: string
 *                         nullable: true
 *                         example: "your-stripe-api-key"
 *                         description: Will be encrypted before storage
 *                       secret_key:
 *                         type: string
 *                         nullable: true
 *                         example: "your-stripe-secret-key"
 *                         description: Will be encrypted before storage
 *                       enabled:
 *                         type: boolean
 *                         nullable: true
 *                         example: false
 *           example:
 *             payment:
 *               enabled: true
 *               gateway: "razorpay"
 *               razorpay:
 *                 key_id: "your-razorpay-key-id"
 *                 key_secret: "your-razorpay-key-secret"
 *                 enabled: true
 *     responses:
 *       200:
 *         description: Payment configuration updated successfully
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
 *                   example: "Payment configuration updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/payment',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.updatePaymentConfig
);

/**
 * @swagger
 * /admin/settings/payment/toggle:
 *   patch:
 *     summary: Toggle payment gateway enable/disable
 *     description: Enable or disable the payment gateway. When disabled, all payment order creation attempts will fail with an appropriate error message. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable payment gateway
 *                 example: false
 *           example:
 *             enabled: false
 *     responses:
 *       200:
 *         description: Payment gateway toggled successfully
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
 *                   example: "Payment gateway disabled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/payment/toggle',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.togglePayment
);

/**
 * @swagger
 * /admin/settings/reset:
 *   post:
 *     summary: Reset settings to default (admin only - Super Admin recommended)
 *     description: Reset all settings to default values (populated from environment variables). WARNING: This will delete all existing settings and recreate defaults. Use with caution. Requires settings:update permission.
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings reset successfully
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
 *                   example: "Settings reset to default successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/Settings'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  '/reset',
  requirePermission(Section.SETTINGS, Action.UPDATE),
  settingsController.resetSettings
);

export default router;

