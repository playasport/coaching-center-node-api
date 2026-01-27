import { Router } from 'express';
import * as sitemapController from '../controllers/sitemap.controller';

const router = Router();

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

export default router;
