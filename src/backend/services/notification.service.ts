import pool from '../config/db.ts';
import { emitEvent } from '../utils/socket.ts';
import { sendEmail as sendMail } from '../utils/email.ts';
import logger from '../utils/logger.ts';

export type NotificationType =
  | 'new_order'
  | 'order_status_changed'
  | 'appointment_created'
  | 'appointment_status_changed'
  | 'review_approved'
  | 'review_rejected'
  | 'low_stock'
  | 'coupon_near_limit';

export interface CreateNotificationParams {
  userId: number | null;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailText?: string;
  emailHtml?: string;
}

export interface NotificationRow {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  email_status: 'pending' | 'sent' | 'failed' | null;
  created_at: string;
}

export class NotificationService {
  /**
   * Create a notification for a specific user and emit real-time socket event.
   */
  static async createNotification(params: CreateNotificationParams): Promise<NotificationRow | null> {
    const { userId, type, title, body, link, sendEmail = false, emailSubject, emailText, emailHtml } = params;

    try {
      const result = await pool.query<NotificationRow>(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, type, title, body, link ?? null]
      );

      const notification = result.rows[0];
      if (!notification) {
        logger.error('Failed to create notification: no row returned');
        return null;
      }

      if (userId) {
        emitEvent('notification:new', {
          notification: {
            id: notification.id,
            type,
            title,
            body,
            link,
            is_read: false,
            created_at: notification.created_at,
          },
          userId,
        });
      } else {
        emitEvent('notification:new', {
          notification: {
            id: notification.id,
            type,
            title,
            body,
            link,
            is_read: false,
            created_at: notification.created_at,
          },
        });
      }

      if (sendEmail && userId) {
        const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          const emailResult = await sendMail(
            user.email,
            emailSubject ?? title,
            emailText ?? body,
            emailHtml
          );
          // Record delivery outcome for auditability — without this, a
          // failed send (bad/revoked SMTP credentials) is only visible by
          // grepping server logs for "[EMAIL SEND ERROR]".
          const emailStatus = emailResult.fellBackToConsole ? 'pending' : (emailResult.success ? 'sent' : 'failed');
          await pool.query('UPDATE notifications SET email_status = $1 WHERE id = $2', [emailStatus, notification.id]);
        }
      }

      logger.info(`📬 Notification created: type=${type}, userId=${userId ?? 'broadcast'}, id=${notification.id}`);
      return notification;
    } catch (error) {
      logger.error('❌ Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Create notifications for all users who have a specific permission (e.g., admin/staff).
   */
  static async createForPermissionHolders(
    permissionKey: string,
    type: NotificationType,
    title: string,
    body: string,
    link?: string,
    sendEmail = false,
    emailSubject?: string,
    emailText?: string,
    emailHtml?: string
  ): Promise<number> {
    try {
      const userRes = await pool.query(
        `SELECT u.id, u.email, u.full_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE p.key = $1`,
        [permissionKey]
      );

      let count = 0;
      for (const user of userRes.rows) {
        await this.createNotification({
          userId: user.id,
          type,
          title,
          body,
          link,
          sendEmail,
          emailSubject,
          emailText,
          emailHtml,
        });
        count++;
      }
      return count;
    } catch (error) {
      logger.error('❌ Failed to create permission-holder notifications:', error);
      return 0;
    }
  }

  /**
   * Get paginated notifications for a user.
   */
  static async getForUser(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: NotificationRow[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      pool.query<NotificationRow>(
        `SELECT id, type, title, body, link, is_read, email_status, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);
    return {
      notifications: dataRes.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notification count for a user.
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Mark a notification as read (owner only).
   */
  static async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const res = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
      [notificationId, userId]
    );
    return res.rows.length > 0;
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(userId: number): Promise<number> {
    const res = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING id`,
      [userId]
    );
    return res.rows.length;
  }
}

export default NotificationService;