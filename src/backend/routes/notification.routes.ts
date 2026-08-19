import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import * as notificationController from '../controllers/notification.controller.ts';

const router = Router();
router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

export { router as notificationRouter };