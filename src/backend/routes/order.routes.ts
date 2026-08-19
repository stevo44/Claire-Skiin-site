import { Router } from 'express';
import { createOrder, getOrders, getOrderById, getShippingCost, getTaxRate } from '../controllers/order.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { validate, orderSchemas } from '../middleware/validation.middleware.ts';

const router = Router();

// @route GET /api/shipping/cost
// @desc Get shipping cost for a city (public)
router.get('/shipping/cost', getShippingCost);

// @route GET /api/orders/tax-rate
// @desc Get current tax rate (public)
router.get('/tax-rate', getTaxRate);

// All order routes require authentication
router.use(authenticateToken);

// @route POST /api/orders
// @desc Create order from cart
router.post('/', validate(orderSchemas.create), createOrder);

// @route GET /api/orders
// @desc Get user orders
router.get('/', getOrders);

// @route GET /api/orders/:id
// @desc Get single user order by ID
router.get('/:id', getOrderById);

export { router as orderRouter };
