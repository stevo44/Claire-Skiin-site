import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { validate, couponSchemas } from '../middleware/validation.middleware.ts';
import { validateCouponController } from '../controllers/coupon.controller.ts';

const router = Router();

/**
 * POST /api/coupons/validate
 * Validates a coupon. Requires authentication (wishlist is auth-gated;
 * coupon follows the same rule — no guest discounts since orders require login).
 */
router.post('/validate', authenticateToken, validate(couponSchemas.validate), validateCouponController);

export { router as couponRouter };
