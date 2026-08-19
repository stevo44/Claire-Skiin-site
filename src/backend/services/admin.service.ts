import pool from '../config/db.ts';

export class AdminService {
  /**
   * @desc Get overall dashboard KPIs
   */
  static async getDashboardKPIs() {
    const queries = {
      todayRevenue: "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= CURRENT_DATE AND status = 'completed'",
      activeOrders: "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'processing', 'shipped')",
      totalClients: "SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'customer'",
      lowStock:     "SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10",
      pendingOrders:"SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
    };

    const [todayRev, activeOrd, clients, lowStock, pendingOrd] = await Promise.all([
      pool.query(queries.todayRevenue),
      pool.query(queries.activeOrders),
      pool.query(queries.totalClients),
      pool.query(queries.lowStock),
      pool.query(queries.pendingOrders)
    ]);

    return {
      todayRevenue: parseFloat(todayRev.rows[0].total),
      activeOrders: parseInt(activeOrd.rows[0].count),
      totalClients: parseInt(clients.rows[0].count),
      lowStock:     parseInt(lowStock.rows[0].count),
      pendingOrders: parseInt(pendingOrd.rows[0].count),
      revenueChange: '+5.2%' // Mocked for now
    };
  }

  /**
   * @desc Get revenue trends for the last 7 days
   */
  static async getRevenueTrends() {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND status = 'completed'
      GROUP BY date
      ORDER BY date ASC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue)
    }));
  }
}
