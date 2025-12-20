import { Router } from 'express';
import * as cmsPageController from '../controllers/cmsPage.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

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
 *                         id:
 *                           type: string
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         slug:
 *                           type: string
 *                           example: "privacy-policy"
 *                         title:
 *                           type: string
 *                           example: "Privacy Policy"
 *                         content:
 *                           type: string
 *                           description: HTML or Markdown content (supports full HTML tags, styling, and formatting)
 *                           example: "<h1>Privacy Policy</h1><p>This Privacy Policy describes how we collect, use, and protect your personal information.</p><h2>Information We Collect</h2><p>We collect information that you provide directly to us...</p>"
 *                         platform:
 *                           type: string
 *                           enum: [web, app, both]
 *                           example: "both"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         version:
 *                           type: number
 *                           example: 1
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:00:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:00:00.000Z"
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         slug: "privacy-policy"
 *                         title: "Privacy Policy"
 *                         content: "<h1>Privacy Policy</h1><p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>"
 *                         platform: "both"
 *                         isActive: true
 *                         version: 1
 *                         createdAt: "2024-01-15T10:00:00.000Z"
 *                         updatedAt: "2024-01-15T10:00:00.000Z"
 *       404:
 *         description: CMS page not found
 *       500:
 *         description: Internal server error
 */
router.get('/:slug', optionalAuthenticate, cmsPageController.getCmsPageBySlug);

export default router;

