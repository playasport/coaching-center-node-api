import { Router } from 'express';
import { getCurrentLocale, setCurrentLocale } from '../controllers/locale.controller';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

const setLocaleSchema = z.object({
  body: z.object({
    locale: z
      .string({ message: 'Locale is required' })
      .refine((val) => ['en', 'hi'].includes(val), {
        message: 'Locale must be either "en" or "hi"',
      }),
  }),
});

/**
 * @swagger
 * /locale:
 *   get:
 *     summary: Get current locale
 *     tags: [Locale]
 *     responses:
 *       200:
 *         description: Current locale information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     locale:
 *                       type: string
 *                       example: "en"
 *                     supportedLocales:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["en", "hi"]
 */
router.get('/', getCurrentLocale);

/**
 * @swagger
 * /locale:
 *   post:
 *     summary: Set locale for current request
 *     tags: [Locale]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locale
 *             properties:
 *               locale:
 *                 type: string
 *                 enum: [en, hi]
 *                 example: "hi"
 *     responses:
 *       200:
 *         description: Locale changed successfully
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
 *                   example: "Language changed to hi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     locale:
 *                       type: string
 *                       example: "hi"
 *       400:
 *         description: Invalid locale
 */
router.post('/', validate(setLocaleSchema), setCurrentLocale);

export default router;

