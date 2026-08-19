import pool from '../config/db.ts';
import { NotificationService } from './notification.service.ts';

export class AdminAnalyticsService {
  /**
   * @desc Get most viewed products
   */
  static async getMostViewedProducts() {
    const query = `
      SELECT 
        metadata->>'productId' as product_id,
        metadata->>'name' as product_name,
        COUNT(*) as views
      FROM events
      WHERE event_type = 'product_view'
      GROUP BY product_id, product_name
      ORDER BY views DESC
      LIMIT 10
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name || 'Unknown Product',
      views: parseInt(row.views || '0')
    }));
  }

  /**
   * @desc Get most purchased products
   */
  static async getMostPurchasedProducts() {
    const query = `
      SELECT 
        p.id, p.name, 
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as total_orders
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 10
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * @desc Calculate conversion rate (Total Orders / Total Sessions)
   * For simplicity, we'll use total product_view events as a proxy for sessions
   */
  static async getConversionRate() {
    const query = `
      WITH stats AS (
        SELECT 
          (SELECT COUNT(*) FROM orders WHERE status = 'completed') as total_orders,
          (SELECT COUNT(*) FROM events WHERE event_type = 'product_view') as total_views
      )
      SELECT 
        total_orders,
        total_views,
        CASE 
          WHEN total_views = 0 THEN 0 
          ELSE (total_orders::float / total_views::float) * 100 
        END as conversion_rate
      FROM stats
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * @desc Calculate cart abandonment rate
   */
  static async getCartAbandonmentRate() {
    const query = `
      WITH stats AS (
        SELECT 
          (SELECT COUNT(*) FROM events WHERE event_type = 'add_to_cart') as total_add_to_cart,
          (SELECT COUNT(*) FROM orders) as total_orders
      )
      SELECT 
        total_add_to_cart,
        total_orders,
        CASE 
          WHEN total_add_to_cart = 0 THEN 0 
          ELSE (1 - (total_orders::float / total_add_to_cart::float)) * 100 
        END as abandonment_rate
      FROM stats
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * @desc Get user activity trends (Events per day)
   */
  static async getUserActivityTrends() {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as event_count
      FROM events
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * @desc Check for low stock products and notify admins
   * Low stock threshold: <= 10 units
   */
  static async checkLowStock(): Promise<{ notified: number; products: any[] }> {
    const query = `
      SELECT id, name, stock_quantity, category
      FROM products
      WHERE stock_quantity <= 10 AND stock_quantity > 0
      ORDER BY stock_quantity ASC
    `;
    const result = await pool.query(query);
    const lowStockProducts = result.rows;

    if (lowStockProducts.length > 0) {
      // Notify admins/staff
      await NotificationService.createForPermissionHolders(
        'inventory:update',
        'low_stock',
        'Low Stock Alert',
        `${lowStockProducts.length} product(s) are running low on stock.`,
        '/admin/products'
      );
    }

    return {
      notified: lowStockProducts.length > 0 ? 1 : 0,
      products: lowStockProducts,
    };
  }
}
