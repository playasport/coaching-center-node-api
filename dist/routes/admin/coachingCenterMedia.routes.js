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
const mediaController = __importStar(require("../../controllers/academy/coachingCenterMedia.controller"));
const coachingCenterUpload_middleware_1 = require("../../middleware/coachingCenterUpload.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /admin/coaching-centers/media:
 *   post:
 *     summary: Upload coaching center media files (admin)
 *     tags: [Admin Coaching Centers]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload media files for coaching center (logo, images, videos, documents) in a single request.
 *       Identical to academy media upload but for admin management.
 *
 *       **Note:**
 *       - All files are initially saved in `temp/` folder.
 *       - Images are automatically compressed.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Media files uploaded successfully
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
 *                   example: "Media files uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     logo:
 *                       type: object
 *                       properties:
 *                         url: { type: 'string', format: 'uri' }
 *                         type: { type: 'string', example: 'logo' }
 *                     images:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'image' }
 *                     videos:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'video' }
 *                     documents:
 *                       type: object
 *                       properties:
 *                         urls: { type: 'array', items: { type: 'string', format: 'uri' } }
 *                         count: { type: 'number' }
 *                         type: { type: 'string', example: 'document' }
 */
router.post('/', auth_middleware_1.authenticate, admin_middleware_1.requireAdmin, coachingCenterUpload_middleware_1.uploadMedia, mediaController.uploadMedia);
exports.default = router;
//# sourceMappingURL=coachingCenterMedia.routes.js.map