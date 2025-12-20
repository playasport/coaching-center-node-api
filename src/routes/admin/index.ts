import { Router } from 'express';
import adminAuthRoutes from './auth.routes';
import permissionRoutes from './permission.routes';
import dashboardRoutes from './dashboard.routes';
import coachingCenterRoutes from './coaching-center.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import sportRoutes from './sport.routes';
import bookingRoutes from './booking.routes';
import batchRoutes from './batch.routes';
import transactionRoutes from './transaction.routes';
import paymentRoutes from './payment.routes';
import bannerRoutes from './banner.routes';
import cmsPageRoutes from './cmsPage.routes';
import notificationRoutes from './notification.routes';

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
router.use('/batches', batchRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payments', paymentRoutes);
router.use('/banners', bannerRoutes);
router.use('/cms-pages', cmsPageRoutes);
router.use('/notifications', notificationRoutes);

export default router;
