import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.ts';

/**
 * @desc  Get all products (public — used by ShopPage, ProductStore)
 * @route GET /api/products
 *
 * FIX: Original countQuery used string interpolation (SQL injection risk).
 *      All values now use parameterised queries ($n placeholders).
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100));
    const search   = ((req.query.search   as string) || '').trim();
    const category = ((req.query.category as string) || '').trim();
    const offset   = (page - 1) * limit;

    // ── Main query (fully parameterised) ─────────────────────────────────────
    const dataParams: unknown[] = [];
    let   dataQuery = 'SELECT * FROM products WHERE 1=1';
    let   n = 1;

    if (category) {
      dataQuery += ` AND category = $${n++}`;
      dataParams.push(category);
    }
    if (search) {
      dataQuery += ` AND (name ILIKE $${n} OR description ILIKE $${n})`;
      dataParams.push(`%${search}%`);
      n++;
    }
    dataQuery += ` ORDER BY created_at DESC LIMIT $${n++} OFFSET $${n++}`;
    dataParams.push(limit, offset);

    // ── Count query (fully parameterised — was vulnerable in original) ────────
    const countParams: unknown[] = [];
    let   countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    let   m = 1;

    if (category) {
      countQuery += ` AND category = $${m++}`;
      countParams.push(category);
    }
    if (search) {
      countQuery += ` AND (name ILIKE $${m} OR description ILIKE $${m})`;
      countParams.push(`%${search}%`);
      m++;
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery,  dataParams),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      products: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single product by ID (public)
 * @route GET /api/products/:id
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
