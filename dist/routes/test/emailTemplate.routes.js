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
const emailTemplateController = __importStar(require("../../controllers/test/emailTemplate.controller"));
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=emailTemplate.routes.js.map