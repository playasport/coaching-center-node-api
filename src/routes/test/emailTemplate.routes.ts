import { Router } from 'express';
import * as emailTemplateController from '../../controllers/test/emailTemplate.controller';

const router = Router();

/**
 * @swagger
 * /test/email-templates:
 *   get:
 *     summary: Get list of all available email templates
 *     tags: [Test - Email Templates]
 *     description: Returns a list of all available email templates for preview
 *     responses:
 *       200:
 *         description: List of email templates
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
 *                   example: "Email templates list retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "booking-approved-user.html"
 *                           previewUrl:
 *                             type: string
 *                             example: "/api/v1/test/email-templates/booking-approved-user"
 */
router.get('/', emailTemplateController.getEmailTemplatesList);

/**
 * @swagger
 * /test/email-templates/{templateName}:
 *   get:
 *     summary: Preview an email template
 *     tags: [Test - Email Templates]
 *     description: Renders and returns the HTML preview of a specific email template with sample data
 *     parameters:
 *       - in: path
 *         name: templateName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the template (without .html extension)
 *         example: "booking-approved-user"
 *     responses:
 *       200:
 *         description: HTML preview of the email template
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad request - Template name is required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.get('/:templateName', emailTemplateController.previewEmailTemplate);

export default router;
