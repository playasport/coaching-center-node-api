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
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/coaching-center/media:
 *   post:
 *     summary: Upload coaching center media files
 *     tags: [Coaching Center Media]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload media files for coaching center (logo, images, videos, documents) in a single request.
 *
 *       **Note:**
 *       - All files are initially saved in `temp/` folder.
 *       - Files are automatically moved to permanent locations when coaching center status changes to 'published'.
 *       - Images (logo and images) are automatically compressed (max width: 1500px, max size: 500KB).
 *
 *       **File Limits:**
 *       - Logo: 1 file (JPEG, PNG, WebP) - max 5MB
 *       - Images: up to 10 files (JPEG, PNG, WebP) - max 5MB each
 *       - Videos: up to 10 files (MP4, MPEG, MOV, AVI) - max 100MB each
 *       - Documents: up to 10 files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG) - max 10MB each
 *
 *       **File Paths:**
 *       - Logo: `temp/coaching/photo/{uuid}.{ext}` → `coaching/photo/{uuid}.{ext}`
 *       - Images: `temp/images/coachingCentres/{uuid}.{ext}` → `images/coachingCentres/{uuid}.{ext}`
 *       - Videos: `temp/videos/coachingCentres/{uuid}.{ext}` → `videos/coachingCentres/{uuid}.{ext}`
 *       - Documents: `temp/documents/coachingCentres/{uuid}.{ext}` → `documents/coachingCentres/{uuid}.{ext}`
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
 *                 description: Logo image file (JPEG, PNG, WebP) - single file. Field name may be "logo" or "logo[]".
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (JPEG, PNG, WebP) - up to 10 files. Field name may be "images" or "images[]".
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Video files (MP4, MPEG, MOV, AVI) - up to 10 files, max 100MB each. Field name may be "videos" or "videos[]".
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Document files (PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG) - up to 10 files, max 10MB each. Field name may be "documents" or "documents[]".
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
 *                         url:
 *                           type: string
 *                           format: uri
 *                           example: "https://bucket.s3.region.amazonaws.com/temp/coaching/photo/uuid.jpg"
 *                         type:
 *                           type: string
 *                           example: "logo"
 *                     images:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                           example: ["https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid.jpg"]
 *                         count:
 *                           type: number
 *                           example: 2
 *                         type:
 *                           type: string
 *                           example: "image"
 *                     videos:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                         count:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "video"
 *                     documents:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                         count:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "document"
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       500:
 *         description: Server error
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.ACADEMY), coachingCenterUpload_middleware_1.uploadMedia, mediaController.uploadMedia);
exports.default = router;
//# sourceMappingURL=coachingCenterMedia.routes.js.map