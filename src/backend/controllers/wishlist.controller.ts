import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { WishlistService } from '../services/wishlist.service.ts';

export const getUserWishlistController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const items = await WishlistService.getUserWishlist(userId);
    const productIds = items.map(item => item.productId);
    res.status(200).json({
      success: true,
      data: items,
      productIds,
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishlistController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const rawProductId = req.body.product_id ?? req.body.productId;
    const productId = parseInt(rawProductId, 10);

    if (isNaN(productId) || productId <= 0) {
      res.status(400).json({ status: 'error', message: 'Valid product_id is required.' });
      return;
    }

    const item = await WishlistService.addToWishlist(userId, productId);
    res.status(201).json({
      success: true,
      message: 'Product added to wishlist.',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlistController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId) || productId <= 0) {
      res.status(400).json({ status: 'error', message: 'Valid productId parameter is required.' });
      return;
    }

    await WishlistService.removeFromWishlist(userId, productId);
    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
    });
  } catch (error) {
    next(error);
  }
};
