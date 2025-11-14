import { Router } from 'express';
import * as sportController from '../controllers/sport.controller';

const router = Router();

/**
 * @swagger
 * /sport:
 *   get:
 *     summary: Get all active sports
 *     tags: [Sport]
 *     description: Retrieve a list of all active sports with name, logo, is_popular, and custom_id
 *     responses:
 *       200:
 *         description: List of sports retrieved successfully
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
 *                   example: "Sports retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SportListItem'
 */
router.get('/', sportController.getAllSports);

export default router;

