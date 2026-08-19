import { Request, Response, NextFunction } from 'express';
import { AdminProductService } from '../services/admin-product.service.ts';
import { AppError } from '../middleware/error.middleware.ts';
import { emitEvent } from '../utils/socket.ts';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await AdminProductService.createProduct(req.body);
    // Broadcast to ALL connected clients so the frontend store refreshes instantly
    emitEvent('product:created', product);
    res.status(201).json(product);
  } catch (error) { next(error); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await AdminProductService.updateProduct(id, req.body);
    if (!product) return next(new AppError('Product not found', 404));
    emitEvent('product:updated', product);
    res.json(product);
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await AdminProductService.deleteProduct(id);
    if (!product) return next(new AppError('Product not found', 404));
    emitEvent('product:deleted', { id });
    res.json({ message: 'Product deleted successfully', product });
  } catch (error) { next(error); }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page     = parseInt(req.query.page as string) || 1;
    const limit    = parseInt(req.query.limit as string) || 50;
    const search   = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const result = await AdminProductService.getProducts(page, limit, search, category);
    res.json(result);
  } catch (error) { next(error); }
};
