import pool from '../config/db.ts';

export class AdminProductService {
  /**
   * @desc Create a new product
   */
  static async createProduct(data: any) {
    const { name, description, price, category, stock_quantity = 50, image_url, metadata = {} } = data;
    const query = `
      INSERT INTO products (name, description, price, category, stock_quantity, image_url, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, price, category, stock_quantity, image_url, JSON.stringify(metadata)]);
    return result.rows[0];
  }

  /**
   * @desc Update an existing product
   */
  static async updateProduct(id: string, data: any) {
    const { name, description, price, category, stock_quantity, image_url, metadata } = data;
    const query = `
      UPDATE products
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category = COALESCE($4, category),
        stock_quantity = COALESCE($5, stock_quantity),
        image_url = COALESCE($6, image_url),
        metadata = COALESCE($7, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, price, category, stock_quantity, image_url, metadata ? JSON.stringify(metadata) : null, id]);
    return result.rows[0];
  }

  /**
   * @desc Delete a product
   */
  static async deleteProduct(id: string) {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * @desc Get all products with pagination, search, and filtering
   */
  static async getProducts(page: number, limit: number, search: string, category: string) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 1;

    if (category) {
      countQuery += ` AND category = $${countParamCount++}`;
      countParams.push(category);
    }

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);

    return {
      products: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
