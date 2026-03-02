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
const mediaController = __importStar(require("../../controllers/academy/employeeMedia.controller"));
const employeeUpload_middleware_1 = require("../../middleware/employeeUpload.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /academy/employee/media:
 *   post:
 *     summary: Upload employee certification files
 *     tags: [Employee Media]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload certification documents for employees.
 *
 *       **File Limits:**
 *       - Certifications: up to 10 files (PDF, JPEG, PNG, WebP) - max 10MB each
 *
 *       **File Paths:**
 *       - Certifications: `temp/images/coaching/employee/{uuid}.{ext}`
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Certification files (PDF, JPEG, PNG, WebP) - up to 10 files, max 10MB each
 *     responses:
 *       200:
 *         description: Certification files uploaded successfully
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
 *                   example: "Certification files uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     certifications:
 *                       type: object
 *                       properties:
 *                         urls:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: uri
 *                           example: ["https://bucket.s3.region.amazonaws.com/temp/images/coaching/employee/uuid.pdf"]
 *                         count:
 *                           type: number
 *                           example: 2
 *                         type:
 *                           type: string
 *                           example: "certification"
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.post('/', auth_middleware_1.authenticate, employeeUpload_middleware_1.uploadCertification, mediaController.uploadCertifications);
exports.default = router;
//# sourceMappingURL=employeeMedia.routes.js.map