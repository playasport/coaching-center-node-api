import { Router } from 'express';
import * as reelController from '../controllers/reel.controller';

const router = Router();

/**
 * @swagger
 * /reels:
 *   get:
 *     summary: Get paginated list of reels
 *     tags: [Reels]
 *     description: Retrieve a paginated list of approved reels (3 per page)
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
 *           default: 3
 *           maximum: 3
 *         description: Number of reels per page (max 3)
 *     responses:
 *       200:
 *         description: Reels retrieved successfully
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
 *                   example: "Reels retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "a9e7fb78-085a-4cbc-993c-9784f8f6576a"
 *                           videoUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1755696149_C60rlU4My8/master.m3u8"
 *                           thumbnailUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1755696149_C60rlU4My8/thumbnail.jpg"
 *                           title:
 *                             type: string
 *                             example: "Line up. Aim. Break. 🎱🔥 #PlayASports #8BallDreams"
 *                           description:
 *                             type: string
 *                             example: "8-Ball Pool isn't just about hitting balls..."
 *                           share_url:
 *                             type: string
 *                             format: uri
 *                             example: "https://playasport.in/reels/a9e7fb78-085a-4cbc-993c-9784f8f6576a"
 *                           user:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Play A Sport"
 *                               avatar:
 *                                 type: string
 *                                 format: uri
 *                                 example: "https://media-playsport.s3.ap-south-1.amazonaws.com/users/profile_photo/wUkolRoiaTFm5EdcmY3oUKrdsXL5pNjFa4syyJ7O.png"
 *                           likes:
 *                             type: integer
 *                             example: 0
 *                           views:
 *                             type: integer
 *                             example: 203
 *                           comments:
 *                             type: integer
 *                             example: 0
 *                     total:
 *                       type: integer
 *                       example: 10
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     total_pages:
 *                       type: integer
 *                       example: 4
 *                     limit:
 *                       type: integer
 *                       example: 3
 */
router.get('/reels', reelController.getReelsList);

/**
 * @swagger
 * /reels/{id}:
 *   get:
 *     summary: Get reels list with a specific reel first
 *     tags: [Reels]
 *     description: |
 *       Retrieve a paginated list of reels where the specified reel appears first.
 *       - Page 1: Returns the target reel first, followed by 2 more reels (3 total)
 *       - Page 2+: Returns 3 reels excluding the target reel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reel ID
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
 *           default: 3
 *           maximum: 3
 *         description: Number of reels per page (max 3)
 *     responses:
 *       200:
 *         description: Reels retrieved successfully
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
 *                   example: "Reels retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           videoUrl:
 *                             type: string
 *                             format: uri
 *                           thumbnailUrl:
 *                             type: string
 *                             format: uri
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           share_url:
 *                             type: string
 *                             format: uri
 *                           user:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                                 format: uri
 *                           likes:
 *                             type: integer
 *                           views:
 *                             type: integer
 *                           comments:
 *                             type: integer
 *                     total:
 *                       type: integer
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     total_pages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                       example: 3
 *       404:
 *         description: Reel not found
 */
router.get('/reels/:id', reelController.getReelsListWithIdFirst);

export default router;
