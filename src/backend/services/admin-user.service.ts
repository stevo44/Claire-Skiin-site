import pool from '../config/db.ts';

export class AdminUserService {
  /**
   * @desc Get all users with pagination, search, and role filtering
   */
  static async getUsers(page: number, limit: number, search: string, role: string) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        u.id, u.email, u.full_name, u.avatar_url, r.name as role, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (role) {
      query += ` AND r.name = $${paramCount++}`;
      params.push(role);
    }

    if (search) {
      query += ` AND (u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY u.id, r.name ORDER BY u.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamCount = 1;

    if (role) {
      countQuery += ` AND r.name = $${countParamCount++}`;
      countParams.push(role);
    }

    if (search) {
      countQuery += ` AND (u.email ILIKE $${countParamCount} OR u.full_name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * @desc Get user activity based on events
   */
  static async getUserActivity(userId: string) {
    const query = `
      SELECT event_type, metadata, created_at
      FROM events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * @desc Update user role
   */
  static async updateUserRole(id: string, role: string) {
    const query = `
      UPDATE users 
      SET role_id = (SELECT id FROM roles WHERE name = $1) 
      WHERE id = $2 
      RETURNING id, email, $1::text as role
    `;
    const result = await pool.query(query, [role, id]);
    return result.rows[0];
  }
}
