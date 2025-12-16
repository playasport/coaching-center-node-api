import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get application settings
 *     tags: [Settings]
 *     description: Retrieve application settings including app name, logo, and contact information. Returns default settings if none exist.
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
 *                   $ref: '#/components/schemas/Settings'
 *       500:
 *         description: Server error
 */
router.get('/', settingsController.getSettings);

export default router;

