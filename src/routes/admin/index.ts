import { Router } from 'express';
import adminAuthRoutes from './auth.routes';
import permissionRoutes from './permission.routes';
import dashboardRoutes from './dashboard.routes';
import coachingCenterRoutes from './coaching-center.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import sportRoutes from './sport.routes';
import bookingRoutes from './booking.routes';

const router = Router();

// Admin routes
router.use('/auth', adminAuthRoutes);
router.use('/permissions', permissionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/coaching-centers', coachingCenterRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/sports', sportRoutes);
router.use('/bookings', bookingRoutes);

export default router;
