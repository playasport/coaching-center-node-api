import { Router } from 'express';
import {
  registerAcademyUser,
  loginAcademyUser,
  sendAcademyOtp,
  verifyAcademyOtp,
} from '../controllers/academyAuth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  academyRegisterSchema,
  academyLoginSchema,
  academyOtpSchema,
  academyVerifyOtpSchema,
} from '../validations/auth.validation';

const router = Router();
/**
 * @swagger
 * /academy/auth/register:
 *   post:
 *     summary: Register a new academy user
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyRegisterRequest'
 *     responses:
 *       201:
 *         description: Academy user registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validate(academyRegisterSchema), registerAcademyUser);

/**
 * @swagger
 * /academy/auth/login:
 *   post:
 *     summary: Login academy user with email and password
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTokenResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validate(academyLoginSchema), loginAcademyUser);

/**
 * @swagger
 * /academy/auth/send-otp:
 *   post:
 *     summary: Send OTP to a mobile number for login or registration
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyOtpRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-otp', validate(academyOtpSchema), sendAcademyOtp);

/**
 * @swagger
 * /academy/auth/verify-otp:
 *   post:
 *     summary: Verify an OTP for login or registration
 *     tags: [Academy Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademyVerifyOtpRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpVerificationResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify-otp', validate(academyVerifyOtpSchema), verifyAcademyOtp);

export default router;


