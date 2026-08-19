import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';

export interface WishlistItemResponse {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    priceDisplay: string;
    category: string;
    stockQuantity: number;
    imageUrl: string;
    img: string;
    metadata: any;
  };
}

export class WishlistService {
  /**
   * Get all wishlisted products for a user
   */
  static async getUserWishlist(userId: number): Promise<WishlistItemResponse[]> {
    const query = `
      SELECT 
        w.id,
        w.user_id AS "userId",
        w.product_id AS "productId",
        w.created_at AS "createdAt",
        p.id AS p_id,
        p.name AS p_name,
        p.description AS p_description,
        p.price AS p_price,
        p.category AS p_category,
        p.stock_quantity AS p_stock,
        p.image_url AS p_image_url,
        p.metadata AS p_metadata
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    return result.rows.map(row => {
      const priceNum = parseFloat(row.p_price);
      return {
        id: row.id,
        userId: row.userId,
        productId: row.productId,
        createdAt: row.createdAt,
        product: {
          id: row.p_id,
          name: row.p_name,
          description: row.p_description || '',
          price: priceNum,
          priceDisplay: `${priceNum.toLocaleString('fr-CM')} XAF`,
          category: row.p_category || '',
          stockQuantity: row.p_stock ?? 0,
          imageUrl: row.p_image_url || '',
          img: row.p_image_url || '',
          metadata: row.p_metadata || {},
        },
      };
    });
  }

  /**
   * Add a product to the user's wishlist (idempotent)
   */
  static async addToWishlist(userId: number, productId: number) {
    // 1. Verify product exists
    const prodCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (prodCheck.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }

    // 2. Insert with ON CONFLICT DO NOTHING for idempotency
    const insertQuery = `
      INSERT INTO wishlists (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING id, user_id AS "userId", product_id AS "productId", created_at AS "createdAt"
    `;

    const result = await pool.query(insertQuery, [userId, productId]);

    if (result.rows.length > 0) {
      logger.info(`❤️ Product ${productId} added to wishlist for user ${userId}`);
      return result.rows[0];
    }

    // If duplicate add, fetch existing entry
    const existingQuery = `
      SELECT id, user_id AS "userId", product_id AS "productId", created_at AS "createdAt"
      FROM wishlists
      WHERE user_id = $1 AND product_id = $2
    `;
    const existingResult = await pool.query(existingQuery, [userId, productId]);
    return existingResult.rows[0];
  }

  /**
   * Remove a product from the user's wishlist
   */
  static async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const deleteQuery = 'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2 RETURNING id';
    const result = await pool.query(deleteQuery, [userId, productId]);
    if (result.rows.length > 0) {
      logger.info(`💔 Product ${productId} removed from wishlist for user ${userId}`);
    }
    return result.rows.length > 0;
  }

  /**
   * Get array of wishlisted product IDs for fast frontend checks
   */
  static async getWishlistedProductIds(userId: number): Promise<number[]> {
    const query = 'SELECT product_id FROM wishlists WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows.map(r => r.product_id);
  }
}
