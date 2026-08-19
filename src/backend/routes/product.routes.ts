import { Router, Request, Response } from 'express';
import { getProducts, getProductById } from '../controllers/product.controller.ts';
import pool from '../config/db.ts';

const router = Router();

// @route GET /api/products/categories
// @desc  Get all unique categories (inlined — controller no longer exports this)
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
    );
    res.json(result.rows.map((r: any) => r.category));
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// @route GET /api/products
// @desc  Get all products with pagination, search, and filtering
router.get('/', getProducts);

// @route GET /api/products/:id
// @desc  Get single product by ID
router.get('/:id', getProductById);

export { router as productRouter };
