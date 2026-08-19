import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cart.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { validate, cartSchemas } from '../middleware/validation.middleware.ts';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

// @route GET /api/cart
// @desc Get user's cart items
router.get('/', getCart);

// @route POST /api/cart
// @desc Add item to cart
router.post('/', validate(cartSchemas.addItem), addToCart);

// @route PUT /api/cart/:id
// @desc Update cart item quantity
router.put('/:id', validate(cartSchemas.updateQuantity), updateCartItem);

// @route DELETE /api/cart
// @desc Clear entire cart
router.delete('/', clearCart);

// @route DELETE /api/cart/:id
// @desc Remove single item from cart
router.delete('/:id', removeFromCart);

export { router as cartRouter };
