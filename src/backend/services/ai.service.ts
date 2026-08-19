import pool from '../config/db.ts';
import logger from '../utils/logger.ts';

export class AIService {
  /**
   * @desc Basic Collaborative Filtering: "People who bought this also bought..."
   * Finds products frequently purchased together with the target product.
   */
  static async getFrequentlyBoughtTogether(productId: string, limit: number = 5) {
    const query = `
      WITH product_orders AS (
        SELECT order_id FROM order_items WHERE product_id = $1
      )
      SELECT 
        p.id, p.name, p.price, p.image_url,
        COUNT(*) as purchase_count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (SELECT order_id FROM product_orders)
      AND oi.product_id != $1
      GROUP BY p.id
      ORDER BY purchase_count DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [productId, limit]);
    return result.rows;
  }

  /**
   * @desc Basic Personalized Recommendations: Based on user's past purchases
   * Suggests products from categories the user has previously bought from, 
   * excluding products they already own.
   */
  static async getPersonalizedRecommendations(userId: string, limit: number = 8) {
    const query = `
      WITH user_categories AS (
        SELECT DISTINCT p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = $1
      ),
      purchased_products AS (
        SELECT DISTINCT product_id
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = $1
      )
      SELECT p.*
      FROM products p
      WHERE p.category IN (SELECT category FROM user_categories)
      AND p.id NOT IN (SELECT product_id FROM purchased_products)
      ORDER BY RANDOM() -- Add some variety
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    
    // Fallback to trending products if no personalized data
    if (result.rows.length === 0) {
      return this.getTrendingProducts(limit);
    }
    
    return result.rows;
  }

  /**
   * @desc Trending Products: Based on recent views and purchases
   */
  static async getTrendingProducts(limit: number = 8) {
    const query = `
      SELECT p.*, COUNT(e.id) as view_count
      FROM products p
      LEFT JOIN events e ON p.id::text = e.metadata->>'productId'
      WHERE e.event_type = 'product_view' OR e.event_type IS NULL
      GROUP BY p.id
      ORDER BY view_count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * @desc Export Events for ML Training
   * Returns events in a structured JSON format suitable for ML pipelines.
   */
  static async exportEventsForML(startDate?: string, endDate?: string) {
    let query = `
      SELECT 
        id, user_id, event_type, metadata, created_at
      FROM events
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * @desc Future Python Integration Placeholder
   * This demonstrates how we would call a Python microservice for advanced inference.
   */
  static async callPythonAIService(payload: any) {
    const PYTHON_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL;
    
    if (!PYTHON_SERVICE_URL) {
      logger.warn('Python AI Service URL not configured. Using local fallback.');
      return null;
    }

    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (error) {
      logger.error('Error calling Python AI Service:', error);
      return null;
    }
  }
}
