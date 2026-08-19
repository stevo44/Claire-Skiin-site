import { Router } from 'express';
import { trackEvent, getAnalytics } from '../controllers/event.controller.ts';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware.ts';

const router = Router();

// @route POST /api/events
// @desc Track a user event
router.post('/', optionalAuthenticateToken, trackEvent);

// @route GET /api/events/analytics
// @desc Get aggregated analytics (Admin/AI)
router.get('/analytics', authenticateToken, getAnalytics);

export { router as eventRouter };
