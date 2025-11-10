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
router.post('/register', validate(academyRegisterSchema), registerAcademyUser);
router.post('/login', validate(academyLoginSchema), loginAcademyUser);
router.post('/send-otp', validate(academyOtpSchema), sendAcademyOtp);
router.post('/verify-otp', validate(academyVerifyOtpSchema), verifyAcademyOtp);

export default router;


