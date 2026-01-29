import { Router } from 'express';
import * as adminCmsPageController from '../../controllers/admin/cmsPage.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin CMS Pages
 *   description: Admin panel CMS page management endpoints for creating, updating, and managing content pages
 */

/**
 * @swagger
 * /admin/cms-pages:
 *   get:
 *     summary: Get all CMS pages
 *     tags: [Admin CMS Pages]
 *     security:
 *       - bearerAuth: []
 *     description: Get all CMS pages with pagination and filters. Requires cms_page:view permission.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *         description: Filter by slug
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, app, both]
 *         description: Filter by platform
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, content, or slug
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: CMS pages retrieved successfully
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
 *                   example: "CMS pages retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     pages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "550e8400-e29b-41d4-a716-446655440000"
 *                           slug:
 *                             type: string
 *                             example: "privacy-policy"
 *                           title:
 *                             type: string
 *                             example: "Privacy Policy"
 *                           content:
 *                             type: string
 *                             description: HTML or Markdown content (supports full HTML tags, styling, and formatting)
 *                             example: "<h1>Privacy Policy</h1><p>Our privacy policy content...</p>"
 *                           platform:
 *                             type: string
 *                             enum: [web, app, both]
 *                             example: "both"
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           version:
 *                             type: number
 *                             example: 1
 *                           updatedBy:
 *                             type: string
 *                             nullable: true
 *                             example: "admin-id-123"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:00:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:00:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                           example: 1
 *                         limit:
 *                           type: number
 *                           example: 10
 *                         total:
 *                           type: number
 *                           example: 25
 *                         totalPages:
 *                           type: number
 *                           example: 3
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/',
  requirePermission(Section.CMS_PAGE, Action.VIEW),
  adminCmsPageController.getAllCmsPages
);

/**
 * @swagger
 * /admin/cms-pages/{id}:
 *   get:
 *     summary: Get CMS page by ID
 *     tags: [Admin CMS Pages]
 *     security:
 *       - bearerAuth: []
 *     description: Get a specific CMS page by ID. Requires cms_page:view permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS page ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
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
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         slug: "privacy-policy"
 *                         title: "Privacy Policy"
 *                         content: "<h1>Privacy Policy</h1><p>Our privacy policy content...</p>"
 *                         platform: "both"
 *                         isActive: true
 *                         version: 1
 *                         updatedBy: "admin-id-123"
 *                         createdAt: "2024-01-15T10:00:00.000Z"
 *                         updatedAt: "2024-01-15T10:00:00.000Z"
 *       404:
 *         description: CMS page not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/:id',
  requirePermission(Section.CMS_PAGE, Action.VIEW),
  adminCmsPageController.getCmsPageById
);

/**
 * @swagger
 * /admin/cms-pages:
 *   post:
 *     summary: Create new CMS page
 *     tags: [Admin CMS Pages]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new CMS page. Requires cms_page:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, title, content]
 *             properties:
 *               slug:
 *                 type: string
 *                 description: Unique identifier (lowercase, hyphens only, e.g., privacy-policy, terms-and-conditions)
 *                 example: "privacy-policy"
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Privacy Policy"
 *               content:
 *                 type: string
 *                 description: HTML or Markdown content. Supports full HTML tags, styling, and formatting.
 *                 example: "<h1>Privacy Policy</h1><p>Our privacy policy content goes here...</p>"
 *               platform:
 *                 type: string
 *                 enum: [web, app, both]
 *                 default: both
 *                 example: "both"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               version:
 *                 type: number
 *                 default: 1
 *                 minimum: 1
 *                 example: 1
 *     responses:
 *       201:
 *         description: CMS page created successfully
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
 *                   example: "CMS page created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: object
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         slug: "privacy-policy"
 *                         title: "Privacy Policy"
 *                         content: "<h1>Privacy Policy</h1><p>Our privacy policy content...</p>"
 *                         platform: "both"
 *                         isActive: true
 *                         version: 1
 *                         updatedBy: "admin-id-123"
 *                         createdAt: "2024-01-15T10:00:00.000Z"
 *                         updatedAt: "2024-01-15T10:00:00.000Z"
 *       400:
 *         description: Bad request - Validation error or slug already exists
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/',
  requirePermission(Section.CMS_PAGE, Action.CREATE),
  adminCmsPageController.createCmsPage
);

/**
 * @swagger
 * /admin/cms-pages/{id}:
 *   patch:
 *     summary: Update CMS page
 *     tags: [Admin CMS Pages]
 *     security:
 *       - bearerAuth: []
 *     description: Update CMS page details. All fields are optional. Requires cms_page:update permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS page ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *                 description: Unique identifier (lowercase, hyphens only)
 *                 example: "privacy-policy"
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Updated Privacy Policy"
 *               content:
 *                 type: string
 *                 description: HTML or Markdown content. Supports full HTML tags, styling, and formatting.
 *                 example: "<h1>Updated Privacy Policy</h1><p>Updated content...</p>"
 *               platform:
 *                 type: string
 *                 enum: [web, app, both]
 *                 example: "web"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               version:
 *                 type: number
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: CMS page updated successfully
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
 *                   example: "CMS page updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: object
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         slug: "privacy-policy"
 *                         title: "Updated Privacy Policy"
 *                         content: "<h1>Updated Privacy Policy</h1><p>Updated content...</p>"
 *                         platform: "web"
 *                         isActive: true
 *                         version: 2
 *                         updatedBy: "admin-id-123"
 *                         createdAt: "2024-01-15T10:00:00.000Z"
 *                         updatedAt: "2024-01-15T14:30:00.000Z"
 *       400:
 *         description: Bad request - Validation error or slug already exists
 *       404:
 *         description: CMS page not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.patch('/:id',
  requirePermission(Section.CMS_PAGE, Action.UPDATE),
  adminCmsPageController.updateCmsPage
);

/**
 * @swagger
 * /admin/cms-pages/{id}:
 *   delete:
 *     summary: Delete CMS page
 *     tags: [Admin CMS Pages]
 *     security:
 *       - bearerAuth: []
 *     description: Soft delete a CMS page. Requires cms_page:delete permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS page ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: CMS page deleted successfully
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
 *                   example: "CMS page deleted successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: CMS page not found
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',
  requirePermission(Section.CMS_PAGE, Action.DELETE),
  adminCmsPageController.deleteCmsPage
);

export default router;

