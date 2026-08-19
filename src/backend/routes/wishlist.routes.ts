import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import {
  getUserWishlistController,
  addToWishlistController,
  removeFromWishlistController,
} from '../controllers/wishlist.controller.ts';

const router = Router();

router.get('/', authenticateToken, getUserWishlistController);
router.post('/', authenticateToken, addToWishlistController);
router.delete('/:productId', authenticateToken, removeFromWishlistController);

export { router as wishlistRouter };
