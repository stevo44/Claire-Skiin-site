import pool from '../config/db.ts';
import { emitEvent } from '../utils/socket.ts';
import { NotificationService } from './notification.service.ts';

export class AdminOrderService {
  /**
   * @desc Get all orders with pagination, status, and date filtering
   */
  static async getOrders(page: number, limit: number, status: string, startDate: string, endDate: string) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.id, o.total_amount, o.status, o.created_at, o.shipping_address, o.delivery_method, o.agency_id, u.full_name as user_name, u.whatsapp_number
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND o.status = $${paramCount++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND o.created_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND o.created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount++}`;
      countParams.push(status);
    }

    if (startDate) {
      countQuery += ` AND created_at >= $${countParamCount++}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ` AND created_at <= $${countParamCount++}`;
      countParams.push(endDate);
    }

    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);

    return {
      orders: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * @desc Get single order details
   */
  static async getOrderById(id: string) {
    const orderQuery = `
      SELECT o.id, o.total_amount, o.status, o.created_at, u.full_name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const orderResult = await pool.query(orderQuery, [id]);
    
    if (orderResult.rows.length === 0) {
      return null;
    }

    const itemsQuery = `
      SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase, p.name as product_name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    return {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };
  }

  /**
   * @desc Update order status
   */
  static async updateOrderStatus(id: string, status: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      const result = await client.query(query, [status, id]);

      if (result.rows.length === 0) {
        return null;
      }

      // Notify customer of status change
      const order = result.rows[0];
      if (order.user_id) {
        await NotificationService.createNotification({
          userId: order.user_id,
          type: 'order_status_changed',
          title: 'Order Status Updated',
          body: `Your order #${id} status has been updated to "${status}".`,
          link: `/orders/${id}`,
          sendEmail: true,
          emailSubject: `Order #${id} Status Updated - Claire Skiin`,
          emailText: `Hi,\n\nYour order #${id} status has been updated to "${status}".\n\nYou can view your order details in your account.\n\nThank you for shopping with Claire Skiin!`,
        });
      }

      await client.query('COMMIT');

      emitEvent('order_updated', {
        orderId: id,
        status,
      });

      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
