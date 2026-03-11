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
const sitemapController = __importStar(require("../controllers/sitemap.controller"));
const router = (0, express_1.Router)();
/**
 * @swagger
 * /sitemap:
 *   get:
 *     summary: Get sitemap data (coaching centres, sports, reels, highlights)
 *     tags: [Sitemap]
 *     description: |
 *       Public endpoint returning minimal data for sitemap/SEO.
 *       Includes coaching centres (id, name), sports (name), reels (id, name), highlights (id, name), and totals.
 *     responses:
 *       200:
 *         description: Sitemap data retrieved successfully
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
 *                   example: "Sitemap data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coaching_centres:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, example: "9b8dd1ae-8549-439c-81f7-4ab458f6a713" }
 *                           name: { type: string, example: "Premjit Sen Martial Arts Academy" }
 *                           type: { type: string, example: "coaching_centre" }
 *                     sports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name: { type: string, example: "Hockey" }
 *                           type: { type: string, example: "sport" }
 *                     reels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           type: { type: string, example: "reel" }
 *                     highlights:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           type: { type: string, example: "highlight" }
 *                     total_coaching_centres: { type: number, example: 946 }
 *                     total_sports: { type: number, example: 54 }
 *                     total_reels: { type: number }
 *                     total_highlights: { type: number }
 *       500:
 *         description: Server error
 */
router.get('/', sitemapController.getSitemap);
exports.default = router;
//# sourceMappingURL=sitemap.routes.js.map