import { Request, Response } from 'express';
import pool from '../config/db.ts';
import logger from '../utils/logger.ts';

/**
 * @desc Get user's cart items
 * @route GET /api/cart
 * @access Private
 */
export const getCart = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        p.id as product_id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.category,
        (p.price * ci.quantity) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    // Calculate total
    const total = result.rows.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);

    res.json({
      items: result.rows,
      total: total.toFixed(2)
    });
  } catch (error) {
    logger.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Internal server error fetching cart' });
  }
};

/**
 * @desc Add item to cart
 * @route POST /api/cart
 * @access Private
 */
export const addToCart = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    // Accept both product_id (snake_case from API) and productId (camelCase fallback)
    const { product_id, productId, quantity = 1 } = req.body;
    const resolvedProductId = product_id ?? productId;

    if (!resolvedProductId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // 1. Validate product existence and stock
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [resolvedProductId]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // 2. Upsert cart item (Update quantity if exists, else insert)
    const upsertQuery = `
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET 
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [userId, resolvedProductId, quantity]);

    res.status(201).json({
      message: 'Item added to cart',
      cartItem: result.rows[0]
    });
  } catch (error) {
    logger.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Internal server error adding to cart' });
  }
};

/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/:id
 * @access Private
 */
export const updateCartItem = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Check if item belongs to user
    const checkQuery = 'SELECT * FROM cart_items WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Update quantity
    const updateQuery = 'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(updateQuery, [quantity, id]);

    res.json({
      message: 'Cart updated',
      cartItem: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal server error updating cart' });
  }
};

/**
 * @desc Remove item from cart
 * @route DELETE /api/cart/:id
 * @access Private
 */
export const removeFromCart = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleteQuery = 'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(deleteQuery, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    logger.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Internal server error removing from cart' });
  }
};

/**
 * @desc Clear all items from user's cart
 * @route DELETE /api/cart
 * @access Private
 */
export const clearCart = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    logger.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Internal server error clearing cart' });
  }
};
