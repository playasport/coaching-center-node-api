import { Router } from 'express';
import * as sportController from '../../controllers/admin/sport.controller';
import { validate } from '../../middleware/validation.middleware';
import { createSportSchema, updateSportSchema } from '../../validations/sport.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/sports:
 *   get:
 *     summary: Get all sports for admin
 *     tags: [Admin Sports]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Successfully retrieved sports
 *   post:
 *     summary: Create a new sport
 *     tags: [Admin Sports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SportCreate'
 *     responses:
 *       201:
 *         description: Sport created successfully
 * 
 * /admin/sports/{id}:
 *   get:
 *     summary: Get sport by ID
 *     tags: [Admin Sports]
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
 *         description: Successfully retrieved sport
 *   patch:
 *     summary: Update a sport
 *     tags: [Admin Sports]
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
 *             $ref: '#/components/schemas/SportUpdate'
 *     responses:
 *       200:
 *         description: Sport updated successfully
 *   delete:
 *     summary: Delete a sport
 *     tags: [Admin Sports]
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
 *         description: Sport deleted successfully
 */

router.get('/', sportController.getAllSports);
router.get('/:id', sportController.getSportById);
router.post('/', validate(createSportSchema), sportController.createSport);
router.patch('/:id', validate(updateSportSchema), sportController.updateSport);
router.delete('/:id', sportController.deleteSport);

export default router;
