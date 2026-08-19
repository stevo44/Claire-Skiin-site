import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware.ts';
import { validate, reviewSchemas } from '../middleware/validation.middleware.ts';
import {
  listReviewsController,
  createReviewController,
  updateReviewController,
  reportReviewController,
} from '../controllers/review.controller.ts';

const router = Router({ mergeParams: true }); // mergeParams: needed to access :productId from parent

/**
 * GET /api/products/:productId/reviews  — public, but passes user if logged in
 */
router.get('/', optionalAuthenticateToken, listReviewsController);

/**
 * POST /api/products/:productId/reviews  — authenticated
 */
router.post('/', authenticateToken, validate(reviewSchemas.create), createReviewController);

/**
 * PUT /api/products/:productId/reviews/:reviewId  — authenticated (own review edit)
 */
router.put('/:reviewId', authenticateToken, validate(reviewSchemas.update), updateReviewController);

export { router as reviewRouter };


/**
 * Standalone router for review-level actions (report) mounted at /api/reviews
 */
const standaloneRouter = Router();
standaloneRouter.post('/:reviewId/report', authenticateToken, validate(reviewSchemas.report), reportReviewController);

export { standaloneRouter as reviewStandaloneRouter };
