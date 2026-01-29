import { Router } from 'express';
import * as adminBannerController from '../../controllers/admin/banner.controller';
import * as bannerImageController from '../../controllers/admin/bannerImage.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { uploadBannerImage, uploadBannerImages } from '../../middleware/bannerUpload.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/banners/upload-image:
 *   post:
 *     summary: Upload single banner image
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     description: Upload a single banner image (desktop or mobile). Images are automatically compressed (except GIF). Requires banner:create permission.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [desktop, mobile]
 *           default: desktop
 *         description: Image type (desktop or mobile)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Banner image file (JPEG, PNG, WebP, or GIF). Max size 5MB.
 *     responses:
 *       200:
 *         description: Banner image uploaded successfully
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
 *                   example: "Banner image uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg"
 *                     type:
 *                       type: string
 *                       example: "desktop"
 *       400:
 *         description: Invalid file or file size exceeded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/upload-image',
  requirePermission(Section.BANNER, Action.CREATE),
  uploadBannerImage,
  bannerImageController.uploadBannerImage
);

/**
 * @swagger
 * /admin/banners/upload-images:
 *   post:
 *     summary: Upload banner images (desktop and mobile)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     description: Upload both desktop and mobile banner images in a single request. Images are automatically compressed (except GIF). Requires banner:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Desktop banner image (required). Max size 5MB.
 *               mobileImage:
 *                 type: string
 *                 format: binary
 *                 description: Mobile banner image (optional). Max size 5MB.
 *     responses:
 *       200:
 *         description: Banner images uploaded successfully
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
 *                   example: "Banner images uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg"
 *                     mobileImageUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg"
 *       400:
 *         description: Invalid file or file size exceeded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/upload-images',
  requirePermission(Section.BANNER, Action.CREATE),
  uploadBannerImages,
  bannerImageController.uploadBannerImages
);

/**
 * @swagger
 * /admin/banners:
 *   get:
 *     summary: Get all banners for admin
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *           enum: [homepage_top, homepage_middle, homepage_bottom, category_top, category_sidebar, sport_page, center_page, search_results, mobile_app_home, mobile_app_category]
 *         description: Filter by banner position
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, scheduled, expired, draft]
 *         description: Filter by banner status
 *       - in: query
 *         name: targetAudience
 *         schema:
 *           type: string
 *           enum: [all, new_users, existing_users, premium_users, mobile_users, web_users]
 *         description: Filter by target audience
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved banners
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
 *                   example: "Banners retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     banners:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example:
 *                         - id: "550e8400-e29b-41d4-a716-446655440000"
 *                           title: "Summer Sports Camp 2024"
 *                           description: "Join our exciting summer sports camp"
 *                           imageUrl: "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg"
 *                           mobileImageUrl: "https://bucket.s3.region.amazonaws.com/banners/summer-camp-mobile.jpg"
 *                           linkUrl: "/sports/cricket"
 *                           linkType: "internal"
 *                           position: "homepage_top"
 *                           priority: 10
 *                           status: "active"
 *                           targetAudience: "all"
 *                           isActive: true
 *                           isOnlyForAcademy: false
 *                           clickCount: 150
 *                           viewCount: 5000
 *                           createdAt: "2024-01-01T10:00:00.000Z"
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
 *                       example:
 *                         page: 1
 *                         limit: 10
 *                         total: 25
 *                         totalPages: 3
 *   post:
 *     summary: Create new banner
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new banner with all configuration options.
 *       
 *       **Recommended Workflow:**
 *       1. Upload images first using `/admin/banners/upload-images` endpoint
 *       2. Use the returned `imageUrl` and `mobileImageUrl` in this request
 *       
 *       **Image Formats Supported:** JPEG, PNG, WebP, GIF (max 5MB each)
 *       **Image Compression:** Automatic for JPEG, PNG, WebP (GIF passed through as-is to preserve animation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, imageUrl, position]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Summer Sports Camp 2024"
 *               description:
 *                 type: string
 *                 example: "Join our exciting summer sports camp"
 *               imageUrl:
 *                 type: string
 *                 description: Banner image URL (upload using /admin/banners/upload-images endpoint first)
 *                 example: "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg"
 *               mobileImageUrl:
 *                 type: string
 *                 nullable: true
 *                 description: Mobile banner image URL (optional, upload using /admin/banners/upload-images endpoint first)
 *                 example: "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg"
 *               linkUrl:
 *                 type: string
 *                 nullable: true
 *                 example: "/sports/cricket"
 *               linkType:
 *                 type: string
 *                 enum: [internal, external, null]
 *                 example: "internal"
 *               position:
 *                 type: string
 *                 enum: [homepage_top, homepage_middle, homepage_bottom, category_top, category_sidebar, sport_page, center_page, search_results, mobile_app_home, mobile_app_category]
 *                 example: "homepage_top"
 *               priority:
 *                 type: number
 *                 default: 0
 *                 example: 10
 *               status:
 *                 type: string
 *                 enum: [active, inactive, scheduled, expired, draft]
 *                 default: draft
 *                 example: "active"
 *               targetAudience:
 *                 type: string
 *                 enum: [all, new_users, existing_users, premium_users, mobile_users, web_users]
 *                 default: all
 *                 example: "all"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               isOnlyForAcademy:
 *                 type: boolean
 *                 default: false
 *                 description: If true, banner is only shown to academies, not to regular users
 *                 example: false
 *               sportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: ["sport-id-1", "sport-id-2"]
 *               centerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: ["center-id-1"]
 *               metadata:
 *                 type: object
 *                 nullable: true
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Banner created successfully
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
 *                   example: "Banner created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     banner:
 *                       type: object
 *       400:
 *         description: Bad request - Validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 * 
 * /admin/banners/{id}:
 *   get:
 *     summary: Get banner by ID
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved banner
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
 *                   example: "Banner retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     banner:
 *                       type: object
 *       404:
 *         description: Banner not found
 *   patch:
 *     summary: Update banner
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               imageUrl:
 *                 type: string
 *               mobileImageUrl:
 *                 type: string
 *                 nullable: true
 *               linkUrl:
 *                 type: string
 *                 nullable: true
 *               linkType:
 *                 type: string
 *                 enum: [internal, external, null]
 *               position:
 *                 type: string
 *                 enum: [homepage_top, homepage_middle, homepage_bottom, category_top, category_sidebar, sport_page, center_page, search_results, mobile_app_home, mobile_app_category]
 *               priority:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, scheduled, expired, draft]
 *               targetAudience:
 *                 type: string
 *                 enum: [all, new_users, existing_users, premium_users, mobile_users, web_users]
 *               isActive:
 *                 type: boolean
 *               isOnlyForAcademy:
 *                 type: boolean
 *                 description: If true, banner is only shown to academies, not to regular users
 *               sportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               centerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               metadata:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       404:
 *         description: Banner not found
 *   delete:
 *     summary: Delete banner (soft delete)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       404:
 *         description: Banner not found
 * 
 * /admin/banners/{id}/status:
 *   patch:
 *     summary: Update banner status
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, scheduled, expired, draft]
 *     responses:
 *       200:
 *         description: Banner status updated successfully
 * 
 * /admin/banners/reorder:
 *   post:
 *     summary: Reorder banners (update priorities)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bannerOrders]
 *             properties:
 *               bannerOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, priority]
 *                   properties:
 *                     id:
 *                       type: string
 *                     priority:
 *                       type: number
 *                 example:
 *                   - id: "banner-id-1"
 *                     priority: 10
 *                   - id: "banner-id-2"
 *                     priority: 9
 *     responses:
 *       200:
 *         description: Banners reordered successfully
 * 
 */

router.get('/', 
  requirePermission(Section.BANNER, Action.VIEW),
  adminBannerController.getAllBanners
);

router.post('/', 
  requirePermission(Section.BANNER, Action.CREATE),
  adminBannerController.createBanner
);

router.get('/:id', 
  requirePermission(Section.BANNER, Action.VIEW),
  adminBannerController.getBannerById
);

router.patch('/:id', 
  requirePermission(Section.BANNER, Action.UPDATE),
  adminBannerController.updateBanner
);

router.delete('/:id', 
  requirePermission(Section.BANNER, Action.DELETE),
  adminBannerController.deleteBanner
);

router.patch('/:id/status', 
  requirePermission(Section.BANNER, Action.UPDATE),
  adminBannerController.updateBannerStatus
);

router.post('/reorder', 
  requirePermission(Section.BANNER, Action.UPDATE),
  adminBannerController.reorderBanners
);

export default router;

