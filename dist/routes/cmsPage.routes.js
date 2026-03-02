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
const cmsPageController = __importStar(require("../controllers/cmsPage.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: CMS Pages
 *   description: Public CMS page endpoints for users
 */
/**
 * @swagger
 * /pages/{slug}:
 *   get:
 *     summary: Get CMS page by slug
 *     tags: [CMS Pages]
 *     description: Get an active CMS page by its slug (e.g., privacy-policy, terms-and-conditions). This is a public endpoint that doesn't require authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS page slug (e.g., privacy-policy, terms-and-conditions, about-us)
 *         example: "privacy-policy"
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, app, both]
 *         description: Filter by platform (optional). If provided, only returns pages for that platform or 'both'.
 *         example: "web"
 *     responses:
 *       200:
 *         description: CMS page retrieved successfully
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
 *                   example: "CMS page retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: object
 *                       properties:
 *                         slug:
 *                           type: string
 *                           example: "privacy-policy"
 *                           description: CMS page slug identifier
 *                         title:
 *                           type: string
 *                           example: "Privacy Policy"
 *                           description: CMS page title
 *                         content:
 *                           type: string
 *                           description: HTML or Markdown content (supports full HTML tags, styling, and formatting)
 *                           example: "<h1>Privacy Policy</h1><p>This Privacy Policy describes how we collect, use, and protect your personal information.</p><h2>Information We Collect</h2><p>We collect information that you provide directly to us...</p>"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:00:00.000Z"
 *                           description: Last update timestamp
 *                       example:
 *                         slug: "privacy-policy"
 *                         title: "Privacy Policy"
 *                         content: "<h1>Privacy Policy</h1><p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>"
 *                         updatedAt: "2024-01-15T10:00:00.000Z"
 *       404:
 *         description: CMS page not found
 *       500:
 *         description: Internal server error
 */
router.get('/:slug', auth_middleware_1.optionalAuthenticate, cmsPageController.getCmsPageBySlug);
exports.default = router;
//# sourceMappingURL=cmsPage.routes.js.map