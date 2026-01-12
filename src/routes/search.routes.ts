import { Router } from 'express';
import { autocomplete, search } from '../controllers/search.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search APIs for autocomplete and full-text search across sports, coaching centers, reels, and highlights
 */

/**
 * @swagger
 * /search/autocomplete:
 *   get:
 *     summary: Autocomplete/Search-as-you-type API
 *     tags: [Search]
 *     description: |
 *       Provides autocomplete suggestions for search-as-you-type functionality.
 *       Searches across all indices (sports, coaching centers, reels, highlights) simultaneously.
 *       Supports geo-based sorting for coaching centers when latitude/longitude provided.
 *       Falls back to MongoDB search if Meilisearch is disabled.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: "cricket"
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results per index (default: 5)
 *         example: 5
 *       - in: query
 *         name: index
 *         schema:
 *           type: string
 *           enum: [sports_index, coaching_centres_index, reels_index, live_streams_index]
 *         description: Optional - Search specific index only
 *         example: "coaching_centres_index"
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude for geo-based sorting (optional)
 *         example: 28.6139
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude for geo-based sorting (optional)
 *         example: 77.2090
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Search radius in kilometers (default: 50km, only for coaching centers)
 *         example: 50
 *     responses:
 *       200:
 *         description: Autocomplete results retrieved successfully
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
 *                   example: "Autocomplete results"
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       example: "cricket"
 *                     total:
 *                       type: integer
 *                       example: 10
 *                       description: Total number of results returned
 *                     total_available:
 *                       type: integer
 *                       example: 25
 *                       description: Total number of results available (may be more than returned)
 *                     size:
 *                       type: integer
 *                       example: 10
 *                     from:
 *                       type: integer
 *                       example: 0
 *                     has_more:
 *                       type: boolean
 *                       example: true
 *                       description: Whether more results are available
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: string
 *                             example: "sports_index"
 *                           id:
 *                             type: string
 *                             example: "sport-uuid"
 *                           name:
 *                             type: string
 *                             example: "Cricket"
 *                           type:
 *                             type: string
 *                             enum: [sport, coaching_center, live_stream, reel]
 *                             example: "sport"
 *                           priority:
 *                             type: integer
 *                             example: 1
 *                             description: Lower number = higher priority
 *                           highlight:
 *                             type: string
 *                             nullable: true
 *                             example: "<em class=\"text-orange-600\">Cricket</em>"
 *                             description: Highlighted search term match
 *                           _distance:
 *                             type: number
 *                             nullable: true
 *                             example: 5.2
 *                             description: Distance in km (only for coaching centers with location)
 *                           stream_key:
 *                             type: string
 *                             nullable: true
 *                             description: Stream key (only for live streams/highlights)
 *                     totals_by_index:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       example:
 *                         sports_index: 1
 *                         coaching_centres_index: 24
 *                     indices_searched:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["sports_index", "coaching_centres_index", "live_streams_index", "reels_index"]
 *       400:
 *         description: Bad request (empty query)
 *       500:
 *         description: Internal server error
 *       503:
 *         description: Service unavailable (Meilisearch disabled - will use MongoDB fallback)
 */
router.get('/autocomplete', autocomplete);

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Full Search API
 *     tags: [Search]
 *     description: |
 *       Full-text search across all indices with pagination, geo-filtering, and advanced sorting.
 *       Searches sports, coaching centers, reels, and highlights simultaneously.
 *       For coaching centers, supports geo-based distance sorting and sport-based prioritization.
 *       Falls back to MongoDB search if Meilisearch is disabled.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string (can also use 'query' parameter)
 *         example: "cricket academy"
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Alternative parameter name for search query
 *         example: "cricket academy"
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results per page
 *         example: 10
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset
 *         example: 0
 *       - in: query
 *         name: index
 *         schema:
 *           type: string
 *           enum: [sports_index, coaching_centres_index, reels_index, live_streams_index]
 *         description: Optional - Search specific index only
 *         example: "coaching_centres_index"
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude for geo-based sorting and filtering
 *         example: 28.6139
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude for geo-based sorting and filtering
 *         example: 77.2090
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Search radius in kilometers (default: 50km, only for coaching centers)
 *         example: 50
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                   example: "Search results"
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: object
 *                       properties:
 *                         text:
 *                           type: string
 *                           example: "cricket academy"
 *                         indices:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["coaching_centres_index", "sports_index", "live_streams_index", "reels_index"]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         total_available:
 *                           type: integer
 *                           example: 25
 *                         size:
 *                           type: integer
 *                           example: 10
 *                         from:
 *                           type: integer
 *                           example: 0
 *                         has_more:
 *                           type: boolean
 *                           example: true
 *                     results_by_index:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           results:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/SearchResult'
 *                           total:
 *                             type: integer
 *                           has_more:
 *                             type: boolean
 *                       example:
 *                         coaching_centres:
 *                           results: []
 *                           total: 20
 *                           has_more: true
 *                         sports:
 *                           results: []
 *                           total: 1
 *                           has_more: false
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchResult'
 *                       description: Flattened results from all indices
 *                     took:
 *                       type: integer
 *                       example: 12
 *                       description: Processing time in milliseconds
 *       400:
 *         description: Bad request (query parameter required)
 *       500:
 *         description: Internal server error
 *       503:
 *         description: Service unavailable (Meilisearch disabled - will use MongoDB fallback)
 */
router.get('/', search);

export default router;
