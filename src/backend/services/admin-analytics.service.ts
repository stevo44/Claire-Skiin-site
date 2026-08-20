import pool from '../config/db.ts';
import { NotificationService } from './notification.service.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convert range pill ('7d'|'30d'|'90d') to an ISO start date string.
// All analytics queries use this as a parameterized $1 lower bound.
// ─────────────────────────────────────────────────────────────────────────────
function rangeToStartDate(range: string): string {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export class AdminAnalyticsService {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING METHODS — updated to accept a startDate so the date-range
  // selector on the page actually filters data.  Defaults to 30 days.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @desc Get most viewed products (date-filtered)
   */
  static async getMostViewedProducts(startDate?: string) {
    const query = `
      SELECT 
        metadata->>'productId' as product_id,
        metadata->>'name' as product_name,
        COUNT(*) as views
      FROM events
      WHERE event_type = 'product_view'
        AND created_at >= $1
      GROUP BY product_id, product_name
      ORDER BY views DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [startDate || rangeToStartDate('30d')]);
    return result.rows.map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name || 'Unknown Product',
      views: parseInt(row.views || '0'),
    }));
  }

  /**
   * @desc Get most purchased products (date-filtered)
   */
  static async getMostPurchasedProducts(startDate?: string) {
    const query = `
      SELECT 
        p.id, p.name, p.category, p.image_url,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as total_orders
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' AND o.created_at >= $1
      GROUP BY p.id, p.name, p.category, p.image_url
      ORDER BY total_quantity DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [startDate || rangeToStartDate('30d')]);
    return result.rows.map((row: any) => ({
      ...row,
      total_quantity: parseInt(row.total_quantity || '0'),
      total_orders: parseInt(row.total_orders || '0'),
    }));
  }

  /**
   * @desc Conversion rate — completed orders / product_view events (date-filtered)
   */
  static async getConversionRate(startDate?: string) {
    const sd = startDate || rangeToStartDate('30d');
    const query = `
      WITH stats AS (
        SELECT 
          (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND created_at >= $1) as total_orders,
          (SELECT COUNT(*) FROM events WHERE event_type = 'product_view' AND created_at >= $1) as total_views
      )
      SELECT 
        total_orders,
        total_views,
        CASE 
          WHEN total_views = 0 THEN 0 
          ELSE ROUND((total_orders::numeric / total_views::numeric) * 100, 1)
        END as conversion_rate
      FROM stats
    `;
    const result = await pool.query(query, [sd]);
    return result.rows[0];
  }

  /**
   * @desc Cart abandonment rate (date-filtered)
   */
  static async getCartAbandonmentRate(startDate?: string) {
    const sd = startDate || rangeToStartDate('30d');
    const query = `
      WITH stats AS (
        SELECT 
          (SELECT COUNT(*) FROM events WHERE event_type = 'add_to_cart' AND created_at >= $1) as total_add_to_cart,
          (SELECT COUNT(*) FROM orders WHERE created_at >= $1) as total_orders
      )
      SELECT 
        total_add_to_cart,
        total_orders,
        CASE 
          WHEN total_add_to_cart = 0 THEN 0 
          ELSE ROUND((1 - (total_orders::numeric / total_add_to_cart::numeric)) * 100, 1)
        END as abandonment_rate
      FROM stats
    `;
    const result = await pool.query(query, [sd]);
    return result.rows[0];
  }

  /**
   * @desc User activity trends (events per day, last 30 days)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PART B — Event-Tracking-Based Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @desc Revenue trends (date-filtered). Moved here from AdminService so the
   *       dashboard endpoint can call everything from one service class.
   */
  static async getRevenueTrends(startDate: string) {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= $1 AND status = 'completed'
      GROUP BY date
      ORDER BY date ASC
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((row: any) => ({
      label: row.date,
      value: parseFloat(row.revenue || '0'),
    }));
  }

  /**
   * @desc Search insights: top searched terms + zero/low-result searches.
   *       Zero-result searches are the highest-value demand signal — they
   *       show customers looking for something not stocked or discoverable.
   */
  static async getSearchInsights(startDate: string) {
    const topQuery = `
      SELECT 
        metadata->>'search_term' as term,
        COUNT(*) as count,
        COALESCE(AVG((metadata->>'result_count')::numeric), 0) as avg_results
      FROM events
      WHERE event_type = 'search' AND created_at >= $1
        AND metadata->>'search_term' IS NOT NULL
        AND metadata->>'search_term' <> ''
      GROUP BY term
      ORDER BY count DESC
      LIMIT 20
    `;
    const zeroQuery = `
      SELECT 
        metadata->>'search_term' as term,
        COUNT(*) as count,
        COALESCE(AVG((metadata->>'result_count')::numeric), 0) as avg_results
      FROM events
      WHERE event_type = 'search' AND created_at >= $1
        AND metadata->>'search_term' IS NOT NULL
        AND metadata->>'search_term' <> ''
      GROUP BY term
      HAVING COALESCE(AVG((metadata->>'result_count')::numeric), 0) <= 2
      ORDER BY count DESC
      LIMIT 20
    `;
    const [top, zero] = await Promise.all([
      pool.query(topQuery, [startDate]),
      pool.query(zeroQuery, [startDate]),
    ]);
    return {
      topSearches: top.rows.map((r: any) => ({
        term: r.term,
        count: parseInt(r.count),
        avgResults: parseFloat(r.avg_results),
      })),
      zeroResultSearches: zero.rows.map((r: any) => ({
        term: r.term,
        count: parseInt(r.count),
        avgResults: parseFloat(r.avg_results),
      })),
    };
  }

  /**
   * @desc Full funnel: product_view → add_to_cart → checkout_started → checkout_completed
   *       with drop-off % at each stage.
   */
  static async getFunnelBreakdown(startDate: string) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'product_view') as product_views,
        COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as add_to_carts,
        COUNT(*) FILTER (WHERE event_type = 'checkout_started') as checkout_started,
        COUNT(*) FILTER (WHERE event_type = 'checkout_completed') as checkout_completed
      FROM events
      WHERE created_at >= $1
        AND event_type IN ('product_view', 'add_to_cart', 'checkout_started', 'checkout_completed')
    `;
    const result = await pool.query(query, [startDate]);
    const r = result.rows[0] || {};
    const pv = parseInt(r.product_views || '0');
    const atc = parseInt(r.add_to_carts || '0');
    const cs = parseInt(r.checkout_started || '0');
    const cc = parseInt(r.checkout_completed || '0');
    return {
      stages: [
        { stage: 'Product Views',        event_type: 'product_view',      count: pv },
        { stage: 'Add to Cart',          event_type: 'add_to_cart',      count: atc },
        { stage: 'Checkout Started',     event_type: 'checkout_started', count: cs },
        { stage: 'Checkout Completed',   event_type: 'checkout_completed',count: cc },
      ],
    };
  }

  /**
   * @desc Delivery method split (local vs agency vs pickup) + agency/town breakdown.
   */
  static async getDeliveryInsights(startDate: string) {
    const splitQuery = `
      SELECT 
        COALESCE(NULLIF(delivery_method, ''), 'local_delivery') as method,
        COUNT(*) as count
      FROM orders
      WHERE created_at >= $1
      GROUP BY 1
      ORDER BY count DESC
    `;
    const agencyQuery = `
      SELECT 
        a.name as agency_name,
        COALESCE(o.shipping_address->>'town', o.shipping_address->>'city', 'Unknown') as town,
        COUNT(*) as count
      FROM orders o
      LEFT JOIN agencies a ON o.agency_id = a.id
      WHERE o.delivery_method = 'agency_shipping' AND o.created_at >= $1
      GROUP BY 1, 2
      ORDER BY count DESC
      LIMIT 10
    `;
    const [split, agencies] = await Promise.all([
      pool.query(splitQuery, [startDate]),
      pool.query(agencyQuery, [startDate]),
    ]);
    return {
      methodSplit: split.rows.map((r: any) => ({
        method: r.method,
        count: parseInt(r.count),
      })),
      agencyBreakdown: agencies.rows.map((r: any) => ({
        agency: r.agency_name || 'Unknown',
        town: r.town,
        count: parseInt(r.count),
      })),
    };
  }

  /**
   * @desc Coupon performance (event side): applied vs led-to-completed-order.
   */
  static async getCouponPerformance(startDate: string) {
    const query = `
      WITH applied AS (
        SELECT metadata->>'coupon_code' as code, COUNT(*) as applied_count
        FROM events
        WHERE event_type = 'coupon_applied' AND created_at >= $1
          AND metadata->>'coupon_code' IS NOT NULL
        GROUP BY code
      ),
      completed AS (
        SELECT c.code, COUNT(DISTINCT o.id) as completed_count,
          COALESCE(SUM(cr.discount_applied), 0) as total_discount
        FROM coupon_redemptions cr
        JOIN coupons c ON cr.coupon_id = c.id
        JOIN orders o ON cr.order_id = o.id
        WHERE o.status = 'completed' AND cr.created_at >= $1
        GROUP BY c.code
      )
      SELECT 
        COALESCE(a.code, comp.code) as code,
        COALESCE(a.applied_count, 0) as applied_count,
        COALESCE(comp.completed_count, 0) as completed_count,
        COALESCE(comp.total_discount, 0) as total_discount
      FROM applied a
      FULL OUTER JOIN completed comp ON a.code = comp.code
      ORDER BY applied_count DESC
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      code: r.code,
      appliedCount: parseInt(r.applied_count),
      completedCount: parseInt(r.completed_count),
      totalDiscount: parseFloat(r.total_discount),
      completionRate: parseInt(r.applied_count) > 0
        ? Math.round((parseInt(r.completed_count) / parseInt(r.applied_count)) * 1000) / 10
        : 0,
    }));
  }

  /**
   * @desc Wishlist demand signal: most-wishlisted products NOT among most-purchased.
   */
  static async getWishlistDemand(startDate: string) {
    const query = `
      WITH most_purchased AS (
        SELECT oi.product_id
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
        GROUP BY oi.product_id
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 10
      )
      SELECT 
        p.id, p.name, p.category, p.price, p.stock_quantity, p.image_url,
        COUNT(w.id) as wishlist_count
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE p.id NOT IN (SELECT product_id FROM most_purchased)
        AND w.created_at >= $1
      GROUP BY p.id, p.name, p.category, p.price, p.stock_quantity, p.image_url
      ORDER BY wishlist_count DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price),
      wishlist_count: parseInt(r.wishlist_count),
    }));
  }

  /**
   * @desc Engagement: avg time-on-page and scroll depth per page path.
   */
  static async getEngagementMetrics(startDate: string) {
    const query = `
      SELECT 
        metadata->>'path' as path,
        AVG((metadata->>'time_on_page_seconds')::numeric) as avg_time_seconds,
        AVG((metadata->>'scroll_depth_percent')::numeric) as avg_scroll_depth,
        COUNT(*) as session_count
      FROM events
      WHERE event_type = 'page_engagement' AND created_at >= $1
        AND metadata->>'path' IS NOT NULL
      GROUP BY path
      ORDER BY avg_time_seconds DESC NULLS LAST
      LIMIT 20
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      path: r.path,
      avgTimeSeconds: r.avg_time_seconds ? Math.round(parseFloat(r.avg_time_seconds)) : 0,
      avgScrollDepth: r.avg_scroll_depth ? Math.round(parseFloat(r.avg_scroll_depth)) : 0,
      sessionCount: parseInt(r.session_count),
    }));
  }

  /**
   * @desc Device and browser breakdown from event metadata (real data).
   */
  static async getDeviceBrowserBreakdown(startDate: string) {
    const deviceQuery = `
      SELECT 
        COALESCE(metadata->>'device', 'unknown') as device,
        COUNT(*) as count
      FROM events
      WHERE created_at >= $1
      GROUP BY device
      ORDER BY count DESC
    `;
    const browserQuery = `
      SELECT 
        COALESCE(metadata->>'browser', 'unknown') as browser,
        COUNT(*) as count
      FROM events
      WHERE created_at >= $1
      GROUP BY browser
      ORDER BY count DESC
    `;
    const [devices, browsers] = await Promise.all([
      pool.query(deviceQuery, [startDate]),
      pool.query(browserQuery, [startDate]),
    ]);
    return {
      devices: devices.rows.map((r: any) => ({ label: r.device, count: parseInt(r.count) })),
      browsers: browsers.rows.map((r: any) => ({ label: r.browser, count: parseInt(r.count) })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART C — Order/Payment/Appointment/Review-Based Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @desc Repeat customer rate & top spenders.
   */
  static async getRepeatCustomerRate(startDate: string) {
    const rateQuery = `
      WITH customer_stats AS (
        SELECT user_id, COUNT(*) as order_count, SUM(total_amount) as total_spend
        FROM orders WHERE status = 'completed'
        GROUP BY user_id
      )
      SELECT 
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE order_count > 1) as repeat_customers,
        CASE WHEN COUNT(*) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE order_count > 1)::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0 END as repeat_rate
      FROM customer_stats
    `;
    const spendersQuery = `
      SELECT 
        u.id, u.email, u.full_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spend
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.status = 'completed' AND o.created_at >= $1
      GROUP BY u.id, u.email, u.full_name
      ORDER BY total_spend DESC
      LIMIT 10
    `;
    const [rate, spenders] = await Promise.all([
      pool.query(rateQuery),
      pool.query(spendersQuery, [startDate]),
    ]);
    return {
      totalCustomers: parseInt(rate.rows[0]?.total_customers || '0'),
      repeatCustomers: parseInt(rate.rows[0]?.repeat_customers || '0'),
      repeatRate: parseFloat(rate.rows[0]?.repeat_rate || '0'),
      topSpenders: spenders.rows.map((r: any) => ({
        ...r,
        order_count: parseInt(r.order_count),
        total_spend: parseFloat(r.total_spend),
      })),
    };
  }

  /**
   * @desc Revenue by delivery destination town.
   */
  static async getRevenueByTown(startDate: string) {
    const query = `
      SELECT 
        COALESCE(o.shipping_address->>'town', o.shipping_address->>'city', 'Unknown') as town,
        COUNT(*) as order_count,
        SUM(o.total_amount) as revenue
      FROM orders o
      WHERE o.status = 'completed' AND o.created_at >= $1
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 15
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      town: r.town,
      orderCount: parseInt(r.order_count),
      revenue: parseFloat(r.revenue),
    }));
  }

  /**
   * @desc Payment success/failure rate split by MTN vs Orange.
   */
  static async getPaymentSuccessRate(startDate: string) {
    const query = `
      SELECT 
        CASE 
          WHEN method IN ('mobile money', 'mobile_money') THEN 'MTN'
          WHEN method = 'orange money' THEN 'Orange'
          WHEN method = 'hosted_link' THEN 'Card/Link'
          ELSE COALESCE(method, 'Unknown')
        END as provider,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'successful') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded
      FROM payments
      WHERE created_at >= $1
      GROUP BY 1
      ORDER BY total DESC
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      provider: r.provider,
      total: parseInt(r.total),
      successful: parseInt(r.successful),
      failed: parseInt(r.failed),
      pending: parseInt(r.pending),
      refunded: parseInt(r.refunded),
      successRate: parseInt(r.total) > 0
        ? Math.round((parseInt(r.successful) / parseInt(r.total)) * 1000) / 10
        : 0,
    }));
  }

  /**
   * @desc Stock velocity / at-risk-of-stockout.
   *       At current sales pace, which products will run out within N days?
   */
  static async getStockVelocity(startDate: string) {
    // Calculate daily sales rate from the date range, then project
    // days-of-stock remaining = stock_quantity / daily_rate.
    const rangeDays = Math.max(
      1,
      Math.round((Date.now() - new Date(startDate).getTime()) / 86400000)
    );
    const query = `
      WITH sales_rate AS (
        SELECT 
          oi.product_id,
          SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed' AND o.created_at >= $1
        GROUP BY oi.product_id
      )
      SELECT 
        p.id, p.name, p.category, p.price, p.stock_quantity, p.image_url,
        COALESCE(sr.total_sold, 0) as units_sold,
        CASE 
          WHEN COALESCE(sr.total_sold, 0) = 0 THEN NULL
          ELSE ROUND(p.stock_quantity::numeric / (sr.total_sold::numeric / $2), 1)
        END as days_of_stock
      FROM products p
      LEFT JOIN sales_rate sr ON p.id = sr.product_id
      WHERE p.stock_quantity > 0 AND p.stock_quantity <= 50
      ORDER BY days_of_stock ASC NULLS LAST
      LIMIT 10
    `;
    const result = await pool.query(query, [startDate, rangeDays]);
    return result.rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price),
      units_sold: parseInt(r.units_sold),
      days_of_stock: r.days_of_stock ? parseFloat(r.days_of_stock) : null,
    }));
  }

  /**
   * @desc Dead stock: products with near-zero sales over the window.
   */
  static async getDeadStock(startDate: string) {
    const query = `
      SELECT 
        p.id, p.name, p.category, p.price, p.stock_quantity, p.image_url,
        COALESCE(sold.total_sold, 0) as units_sold
      FROM products p
      LEFT JOIN (
        SELECT oi.product_id, SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed' AND o.created_at >= $1
        GROUP BY oi.product_id
      ) sold ON p.id = sold.product_id
      WHERE COALESCE(sold.total_sold, 0) <= 1
      ORDER BY units_sold ASC, p.stock_quantity DESC
      LIMIT 20
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price),
      units_sold: parseInt(r.units_sold),
    }));
  }

  /**
   * @desc Appointment cancellation/no-show rate — overall and by service.
   */
  static async getAppointmentStats(startDate: string) {
    const overallQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        CASE WHEN COUNT(*) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE status IN ('cancelled', 'no_show'))::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0 END as cancel_noshow_rate
      FROM appointments
      WHERE created_at >= $1
    `;
    const byServiceQuery = `
      SELECT 
        ss.name as service_name,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE a.status = 'no_show') as no_show
      FROM appointments a
      JOIN appointment_services aps ON a.id = aps.appointment_id
      JOIN spa_services ss ON aps.service_id = ss.id
      WHERE a.created_at >= $1
      GROUP BY ss.name
      ORDER BY total DESC
    `;
    const [overall, byService] = await Promise.all([
      pool.query(overallQuery, [startDate]),
      pool.query(byServiceQuery, [startDate]),
    ]);
    return {
      overall: {
        total: parseInt(overall.rows[0]?.total || '0'),
        cancelled: parseInt(overall.rows[0]?.cancelled || '0'),
        noShow: parseInt(overall.rows[0]?.no_show || '0'),
        completed: parseInt(overall.rows[0]?.completed || '0'),
        cancelNoShowRate: parseFloat(overall.rows[0]?.cancel_noshow_rate || '0'),
      },
      byService: byService.rows.map((r: any) => ({
        serviceName: r.service_name,
        total: parseInt(r.total),
        cancelled: parseInt(r.cancelled),
        noShow: parseInt(r.no_show),
      })),
    };
  }

  /**
   * @desc Refund rate — overall and per-product.
   */
  static async getRefundRate(startDate: string) {
    const overallQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded,
        CASE WHEN COUNT(*) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE status = 'refunded')::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0 END as refund_rate
      FROM orders WHERE created_at >= $1
    `;
    const perProductQuery = `
      SELECT 
        p.id, p.name,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'refunded') as refunded_count,
        CASE WHEN COUNT(DISTINCT o.id) > 0 
          THEN ROUND(COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'refunded')::numeric / COUNT(DISTINCT o.id)::numeric * 100, 1)
          ELSE 0 END as refund_rate
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'refunded') > 0
      ORDER BY refund_rate DESC
      LIMIT 10
    `;
    const [overall, perProduct] = await Promise.all([
      pool.query(overallQuery, [startDate]),
      pool.query(perProductQuery, [startDate]),
    ]);
    return {
      overall: {
        totalOrders: parseInt(overall.rows[0]?.total_orders || '0'),
        refunded: parseInt(overall.rows[0]?.refunded || '0'),
        refundRate: parseFloat(overall.rows[0]?.refund_rate || '0'),
      },
      perProduct: perProduct.rows.map((r: any) => ({
        ...r,
        order_count: parseInt(r.order_count),
        refunded_count: parseInt(r.refunded_count),
        refund_rate: parseFloat(r.refund_rate),
      })),
    };
  }

  /**
   * @desc Rating trend: 30-day avg vs lifetime avg — surface sliding products.
   */
  static async getRatingTrends(_startDate: string) {
    // Always compare last 30 days vs lifetime — fixed windows, not range-dependent
    const query = `
      WITH lifetime AS (
        SELECT product_id, AVG(rating) as lifetime_avg, COUNT(*) as lifetime_count
        FROM reviews WHERE status = 'approved'
        GROUP BY product_id
      ),
      recent AS (
        SELECT product_id, AVG(rating) as recent_avg, COUNT(*) as recent_count
        FROM reviews WHERE status = 'approved' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY product_id
      )
      SELECT 
        p.id, p.name,
        ROUND(l.lifetime_avg, 2) as lifetime_avg,
        l.lifetime_count,
        ROUND(r.recent_avg, 2) as recent_avg,
        r.recent_count,
        ROUND(r.recent_avg - l.lifetime_avg, 2) as delta,
        CASE 
          WHEN r.recent_avg > l.lifetime_avg THEN 'up'
          WHEN r.recent_avg < l.lifetime_avg THEN 'down'
          ELSE 'flat'
        END as trend
      FROM lifetime l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN recent r ON l.product_id = r.product_id
      WHERE r.recent_count >= 1
      ORDER BY delta ASC
      LIMIT 10
    `;
    const result = await pool.query(query);
    return result.rows.map((r: any) => ({
      ...r,
      lifetime_avg: parseFloat(r.lifetime_avg),
      lifetime_count: parseInt(r.lifetime_count),
      recent_avg: parseFloat(r.recent_avg),
      recent_count: parseInt(r.recent_count),
      delta: parseFloat(r.delta),
    }));
  }

  /**
   * @desc Coupon-driven vs. organic revenue split.
   */
  static async getCouponVsOrganicRevenue(startDate: string) {
    const query = `
      SELECT 
        CASE WHEN o.coupon_id IS NOT NULL THEN 'coupon' ELSE 'organic' END as type,
        COUNT(*) as order_count,
        SUM(o.total_amount) as revenue,
        SUM(o.discount_amount) as total_discount
      FROM orders o
      WHERE o.status = 'completed' AND o.created_at >= $1
      GROUP BY 1
      ORDER BY revenue DESC
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      type: r.type,
      orderCount: parseInt(r.order_count),
      revenue: parseFloat(r.revenue || '0'),
      totalDiscount: parseFloat(r.total_discount || '0'),
    }));
  }

  /**
   * @desc Peak order times: by day of week and hour of day.
   */
  static async getPeakOrderTimes(startDate: string) {
    const dowQuery = `
      SELECT 
        EXTRACT(DOW FROM created_at)::int as dow,
        TO_CHAR(created_at, 'DY') as day_name,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= $1
      GROUP BY dow, day_name
      ORDER BY dow
    `;
    const hourQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= $1
      GROUP BY hour
      ORDER BY hour
    `;
    const [dow, hour] = await Promise.all([
      pool.query(dowQuery, [startDate]),
      pool.query(hourQuery, [startDate]),
    ]);
    return {
      byDayOfWeek: dow.rows.map((r: any) => ({
        dow: r.dow,
        dayName: r.day_name,
        orderCount: parseInt(r.order_count),
      })),
      byHour: hour.rows.map((r: any) => ({
        hour: r.hour,
        orderCount: parseInt(r.order_count),
      })),
    };
  }

  /**
   * @desc Category-level performance: Skincare vs Lip Care vs Hair Care.
   */
  static async getCategoryPerformance(startDate: string) {
    const query = `
      SELECT 
        COALESCE(NULLIF(p.category, ''), 'Uncategorized') as category,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * oi.price_at_purchase) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' AND o.created_at >= $1
      GROUP BY 1
      ORDER BY revenue DESC
    `;
    const result = await pool.query(query, [startDate]);
    return result.rows.map((r: any) => ({
      category: r.category,
      orderCount: parseInt(r.order_count),
      unitsSold: parseInt(r.units_sold),
      revenue: parseFloat(r.revenue || '0'),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD AGGREGATOR — single call returns everything for the page.
  // Runs all queries in parallel via Promise.all for best throughput.
  // ═══════════════════════════════════════════════════════════════════════════

  static async getDashboard(range: string = '30d') {
    const startDate = rangeToStartDate(range);

    const safe = async <T>(promise: Promise<T>, fallback: T, name: string): Promise<T> => {
      try {
        return await promise;
      } catch (err: any) {
        console.error(`⚠️ Analytics query [${name}] failed:`, err?.message || err);
        return fallback;
      }
    };

    const [
      revenueTrends,
      conversionRate,
      cartAbandonment,
      topProducts,
      searchInsights,
      funnel,
      deliveryInsights,
      couponPerformance,
      wishlistDemand,
      engagement,
      deviceBrowser,
      repeatCustomers,
      revenueByTown,
      paymentStats,
      stockVelocity,
      deadStock,
      appointmentStats,
      refundRate,
      ratingTrends,
      couponVsOrganic,
      peakTimes,
      categoryPerf,
    ] = await Promise.all([
      safe(this.getRevenueTrends(startDate), [], 'revenueTrends'),
      safe(this.getConversionRate(startDate), { total_orders: 0, total_views: 0, conversion_rate: 0 }, 'conversionRate'),
      safe(this.getCartAbandonmentRate(startDate), { total_add_to_cart: 0, total_orders: 0, abandonment_rate: 0 }, 'cartAbandonment'),
      safe(this.getMostPurchasedProducts(startDate), [], 'topProducts'),
      safe(this.getSearchInsights(startDate), { topSearches: [], zeroResultSearches: [] }, 'searchInsights'),
      safe(this.getFunnelBreakdown(startDate), {
        stages: [
          { stage: 'Product Views', event_type: 'product_view', count: 0 },
          { stage: 'Add to Cart', event_type: 'add_to_cart', count: 0 },
          { stage: 'Checkout Started', event_type: 'checkout_started', count: 0 },
          { stage: 'Checkout Completed', event_type: 'checkout_completed', count: 0 },
        ],
      }, 'funnel'),
      safe(this.getDeliveryInsights(startDate), { methodSplit: [], agencyBreakdown: [] }, 'deliveryInsights'),
      safe(this.getCouponPerformance(startDate), [], 'couponPerformance'),
      safe(this.getWishlistDemand(startDate), [], 'wishlistDemand'),
      safe(this.getEngagementMetrics(startDate), [], 'engagement'),
      safe(this.getDeviceBrowserBreakdown(startDate), { devices: [], browsers: [] }, 'deviceBrowser'),
      safe(this.getRepeatCustomerRate(startDate), { totalCustomers: 0, repeatCustomers: 0, repeatRate: 0, topSpenders: [] }, 'repeatCustomers'),
      safe(this.getRevenueByTown(startDate), [], 'revenueByTown'),
      safe(this.getPaymentSuccessRate(startDate), [], 'paymentStats'),
      safe(this.getStockVelocity(startDate), [], 'stockVelocity'),
      safe(this.getDeadStock(startDate), [], 'deadStock'),
      safe(this.getAppointmentStats(startDate), {
        overall: { total: 0, cancelled: 0, noShow: 0, completed: 0, cancelNoShowRate: 0 },
        byService: [],
      }, 'appointmentStats'),
      safe(this.getRefundRate(startDate), {
        overall: { totalOrders: 0, refunded: 0, refundRate: 0 },
        perProduct: [],
      }, 'refundRate'),
      safe(this.getRatingTrends(startDate), [], 'ratingTrends'),
      safe(this.getCouponVsOrganicRevenue(startDate), [], 'couponVsOrganic'),
      safe(this.getPeakOrderTimes(startDate), { byDayOfWeek: [], byHour: [] }, 'peakTimes'),
      safe(this.getCategoryPerformance(startDate), [], 'categoryPerf'),
    ]);

    return {
      range,
      startDate,
      revenueTrends,
      conversionRate,
      cartAbandonment,
      topProducts,
      searchInsights,
      funnel,
      deliveryInsights,
      couponPerformance,
      wishlistDemand,
      engagement,
      deviceBrowser,
      repeatCustomers,
      revenueByTown,
      paymentStats,
      stockVelocity,
      deadStock,
      appointmentStats,
      refundRate,
      ratingTrends,
      couponVsOrganic,
      peakTimes,
      categoryPerf,
    };
  }
}
