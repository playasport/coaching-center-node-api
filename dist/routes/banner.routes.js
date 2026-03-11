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
const bannerController = __importStar(require("../controllers/banner.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Public banner endpoints for users
 */
/**
 * @swagger
 * /banners/{position}:
 *   get:
 *     summary: Get active banners by position
 *     tags: [Banners]
 *     description: Get active banners for a specific position (e.g., homepage_top, sport_page). Banners are filtered by scheduling, targeting, and sorted by priority.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position
 *         required: true
 *         schema:
 *           type: string
 *           enum: [homepage_top, homepage_middle, homepage_bottom, category_top, category_sidebar, sport_page, center_page, search_results, mobile_app_home, mobile_app_category]
 *         description: Banner position
 *         example: homepage_top
 *       - in: query
 *         name: sportId
 *         schema:
 *           type: string
 *         description: Filter banners by sport ID (optional)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter banners by center ID (optional)
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of banners to return
 *         example: 5
 *       - in: query
 *         name: targetAudience
 *         schema:
 *           type: string
 *           enum: [all, new_users, existing_users, premium_users, mobile_users, web_users]
 *         description: Filter by target audience (optional)
 *         example: all
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "550e8400-e29b-41d4-a716-446655440000"
 *                           title:
 *                             type: string
 *                             example: "Summer Sports Camp 2024"
 *                           description:
 *                             type: string
 *                             example: "Join our exciting summer sports camp"
 *                           imageUrl:
 *                             type: string
 *                             example: "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg"
 *                           mobileImageUrl:
 *                             type: string
 *                             nullable: true
 *                             example: "https://bucket.s3.region.amazonaws.com/banners/summer-camp-mobile.jpg"
 *                           linkUrl:
 *                             type: string
 *                             nullable: true
 *                             example: "/sports/cricket"
 *                           linkType:
 *                             type: string
 *                             enum: [internal, external]
 *                             nullable: true
 *                             example: "internal"
 *                           position:
 *                             type: string
 *                             example: "homepage_top"
 *                           priority:
 *                             type: number
 *                             example: 10
 *                         example:
 *                           - id: "550e8400-e29b-41d4-a716-446655440000"
 *                             title: "Summer Sports Camp 2024"
 *                             description: "Join our exciting summer sports camp"
 *                             imageUrl: "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg"
 *                             mobileImageUrl: "https://bucket.s3.region.amazonaws.com/banners/summer-camp-mobile.jpg"
 *                             linkUrl: "/sports/cricket"
 *                             linkType: "internal"
 *                             position: "homepage_top"
 *                             priority: 10
 *                           - id: "660e8400-e29b-41d4-a716-446655440001"
 *                             title: "Winter Registration Open"
 *                             description: "Register now for winter sports coaching"
 *                             imageUrl: "https://bucket.s3.region.amazonaws.com/banners/winter.jpg"
 *                             mobileImageUrl: null
 *                             linkUrl: "/campaigns/winter-2024"
 *                             linkType: "internal"
 *                             position: "homepage_top"
 *                             priority: 8
 *       400:
 *         description: Invalid banner position
 *       500:
 *         description: Internal server error
 */
router.get('/:position', auth_middleware_1.optionalAuthenticate, bannerController.getBannersByPosition);
/**
 * @swagger
 * /banners/{id}/track/view:
 *   post:
 *     summary: Track banner view
 *     tags: [Banners]
 *     description: Increment the view count for a banner (for analytics). This endpoint is optional and failures are silently ignored.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Banner view tracked successfully
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
 *                   example: "Banner view tracked successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
router.post('/:id/track/view', auth_middleware_1.optionalAuthenticate, bannerController.trackBannerView);
/**
 * @swagger
 * /banners/{id}/track/click:
 *   post:
 *     summary: Track banner click
 *     tags: [Banners]
 *     description: Increment the click count for a banner (for analytics). This endpoint is optional and failures are silently ignored.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Banner click tracked successfully
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
 *                   example: "Banner click tracked successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
router.post('/:id/track/click', auth_middleware_1.optionalAuthenticate, bannerController.trackBannerClick);
exports.default = router;
//# sourceMappingURL=banner.routes.js.map