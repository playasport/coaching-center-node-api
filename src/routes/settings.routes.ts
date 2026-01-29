import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get limited public settings
 *     tags: [Settings]
 *     description: Retrieve limited public-facing settings including app name, logo, and contact information only. This is a public endpoint with no authentication required. Returns only essential public data (app_name, app_logo, contact). All other settings (fees, basic_info, notifications, payment) are excluded and available only through admin endpoints.
 *     responses:
 *       200:
 *         description: Limited settings retrieved successfully
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
 *                     app_name:
 *                       type: string
 *                       nullable: true
 *                       example: "Play A Sport"
 *                     app_logo:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://testplayasport.s3.ap-south-1.amazonaws.com/images/logo/afa40028-96af-45af-ad94-4c8fb33f8100.png"
 *                     contact:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         number:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["+919230981848", "+919230981845", "+919546576177"]
 *                         email:
 *                           type: string
 *                           format: email
 *                           nullable: true
 *                           example: "info@playasport.com"
 *                         address:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             office:
 *                               type: string
 *                               nullable: true
 *                               example: "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"
 *                             registered:
 *                               type: string
 *                               nullable: true
 *                               example: "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
 *                         whatsapp:
 *                           type: string
 *                           nullable: true
 *                           example: "+919230981848"
 *                         instagram:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: "https://www.instagram.com/playasport.in/"
 *                         facebook:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: "https://www.facebook.com/PlayASportIndia"
 *                         youtube:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           example: "https://www.youtube.com/@PlayASport_in"
 *             example:
 *               success: true
 *               message: "Settings retrieved successfully"
 *               data:
 *                 app_name: "Play A Sport"
 *                 app_logo: "https://testplayasport.s3.ap-south-1.amazonaws.com/images/logo/afa40028-96af-45af-ad94-4c8fb33f8100.png"
 *                 contact:
 *                   number: ["+919230981848", "+919230981845", "+919546576177"]
 *                   email: "info@playasport.com"
 *                   address:
 *                     office: "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"
 *                     registered: "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
 *                   whatsapp: "+919230981848"
 *                   instagram: "https://www.instagram.com/playasport.in/"
 *                   facebook: "https://www.facebook.com/PlayASportIndia"
 *                   youtube: "https://www.youtube.com/@PlayASport_in"
 *       500:
 *         description: Server error
 */
router.get('/', settingsController.getLimitedPublicSettings);

export default router;

