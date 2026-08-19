import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import * as aiController from '../controllers/ai.controller.ts';
import { handleAIChat } from '../controllers/ai-chat.controller.ts';

const router = Router();

// Stricter rate limiter specifically for AI Chat to control costs & prevent abuse
// (10 requests per 15 minutes per IP)
const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many chat requests. Please wait a few minutes before asking another question.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Public AI Chat Assistant Route
router.post('/chat', aiChatLimiter, handleAIChat);

// Public AI Recommendation Routes (existing engine untouched)
router.get('/trending', aiController.getTrendingProducts);
router.get('/frequently-bought/:productId', aiController.getFrequentlyBoughtTogether);

// User-Specific AI Recommendation Routes (existing engine untouched)
router.get('/recommendations', authenticateToken, aiController.getPersonalizedRecommendations);

export { router as aiRouter };
