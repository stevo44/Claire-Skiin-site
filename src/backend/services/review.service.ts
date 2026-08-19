import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';
import { NotificationService } from './notification.service.ts';

export interface ReviewRow {
  id: number;
  user_id: number;
  product_id: number;
  order_id: number | null;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  created_at: string;
  updated_at: string;
}

export interface ReviewAggregate {
  average_rating: number;
  review_count: number;
}

export class ReviewService {
  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * List approved reviews for a product with pagination.
   * Also returns the aggregate (average + count) over ALL approved reviews.
   */
  static async listForProduct(
    productId: number,
    page = 1,
    limit = 10,
    viewerUserId: number | null = null,
  ) {
    const offset = (page - 1) * limit;

    // Approved reviews (public) + show the viewer's own pending review too
    const reviewsRes = await pool.query(
      `SELECT
         r.id,
         r.user_id,
         r.product_id,
         r.rating,
         r.title,
         r.body,
         r.is_verified_purchase,
         r.status,
         r.created_at,
         r.updated_at,
         u.email AS reviewer_email
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
         AND (
           r.status = 'approved'
           OR ($4 IS NOT NULL AND r.user_id = $4)
         )
       ORDER BY r.status = 'approved' DESC, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset, viewerUserId],
    );

    // Aggregate over approved reviews only
    const aggRes = await pool.query(
      `SELECT
         COALESCE(AVG(rating), 0)::NUMERIC(3,1) AS average_rating,
         COUNT(*) AS review_count
       FROM reviews
       WHERE product_id = $1 AND status = 'approved'`,
      [productId],
    );

    // Has the viewer already submitted a review for this product?
    let userReview: ReviewRow | null = null;
    if (viewerUserId) {
      const userRes = await pool.query(
        `SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2 LIMIT 1`,
        [productId, viewerUserId],
      );
      userReview = userRes.rows[0] ?? null;
    }

    const agg = aggRes.rows[0];

    return {
      reviews: reviewsRes.rows,
      aggregate: {
        average_rating: parseFloat(agg.average_rating),
        review_count: parseInt(agg.review_count, 10),
      },
      userReview,
      pagination: { page, limit, offset },
    };
  }

  /**
   * Create a review. Checks:
   *  - Product exists
   *  - User hasn't already reviewed this product (uniqueness)
   *  - Sets is_verified_purchase based on a paid order containing the product
   *  - New reviews start as 'pending' (require admin approval)
   */
  static async create(data: {
    userId: number;
    productId: number;
    rating: number;
    title?: string | null;
    body: string;
  }): Promise<ReviewRow> {
    const { userId, productId, rating, title, body } = data;

    // 1. Product exists
    const prodRes = await pool.query(
      `SELECT id FROM products WHERE id = $1`,
      [productId],
    );
    if (prodRes.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }

    // 2. One review per product per user
    const existsRes = await pool.query(
      `SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2 LIMIT 1`,
      [userId, productId],
    );
    if (existsRes.rows.length > 0) {
      throw new AppError(
        'You have already reviewed this product. You can edit your existing review.',
        409,
      );
    }

    // 3. Verified purchase check — does the user have a paid order containing this product?
    const vpRes = await pool.query(
      `SELECT oi.id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = $1
         AND oi.product_id = $2
         AND o.status = 'paid'
       LIMIT 1`,
      [userId, productId],
    );
    const isVerifiedPurchase = vpRes.rows.length > 0;

    // 4. Find the most recent qualifying order_id (for the FK)
    let orderId: number | null = null;
    if (isVerifiedPurchase) {
      const orderRes = await pool.query(
        `SELECT o.id
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = $1
           AND oi.product_id = $2
           AND o.status = 'paid'
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [userId, productId],
      );
      orderId = orderRes.rows[0]?.id ?? null;
    }

    const result = await pool.query(
      `INSERT INTO reviews
         (user_id, product_id, order_id, rating, title, body, is_verified_purchase, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [userId, productId, orderId, rating, title ?? null, body, isVerifiedPurchase],
    );

    logger.info(
      `✅ Review created: user #${userId}, product #${productId}, verified=${isVerifiedPurchase}`,
    );
    return result.rows[0];
  }

  /**
   * Edit own review (user can edit their own pending review only).
   */
  static async update(
    reviewId: number,
    userId: number,
    data: { rating?: number; title?: string | null; body?: string },
  ): Promise<ReviewRow> {
    const revRes = await pool.query(
      `SELECT * FROM reviews WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [reviewId, userId],
    );
    if (revRes.rows.length === 0) {
      throw new AppError('Review not found or does not belong to you.', 404);
    }

    const review = revRes.rows[0] as ReviewRow;
    if (review.status === 'approved') {
      throw new AppError(
        'Approved reviews cannot be edited. Please contact support.',
        403,
      );
    }

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.rating !== undefined) { sets.push(`rating = $${idx++}`); values.push(data.rating); }
    if ('title' in data) { sets.push(`title = $${idx++}`); values.push(data.title ?? null); }
    if (data.body !== undefined) { sets.push(`body = $${idx++}`); values.push(data.body); }

    if (sets.length === 0) throw new AppError('No fields to update.', 400);

    // Re-submit for approval
    sets.push(`status = 'pending'`, `updated_at = CURRENT_TIMESTAMP`);
    values.push(reviewId);

    const result = await pool.query(
      `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  // ── Reporting ────────────────────────────────────────────────────────────

  static async report(
    reviewId: number,
    reporterUserId: number,
    reason: string,
  ) {
    // Verify review exists and is approved (can only report visible reviews)
    const revRes = await pool.query(
      `SELECT id FROM reviews WHERE id = $1 AND status = 'approved' LIMIT 1`,
      [reviewId],
    );
    if (revRes.rows.length === 0) {
      throw new AppError('Review not found or not publicly visible.', 404);
    }

    // Prevent duplicate reports from same user
    const dupRes = await pool.query(
      `SELECT id FROM review_reports WHERE review_id = $1 AND reporter_user_id = $2 LIMIT 1`,
      [reviewId, reporterUserId],
    );
    if (dupRes.rows.length > 0) {
      throw new AppError('You have already reported this review.', 409);
    }

    const result = await pool.query(
      `INSERT INTO review_reports (review_id, reporter_user_id, reason, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [reviewId, reporterUserId, reason.trim()],
    );
    logger.info(
      `🚩 Review #${reviewId} reported by user #${reporterUserId}`,
    );
    return result.rows[0];
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  static async adminList(status?: string) {
    const whereClause = status ? `WHERE r.status = $1` : '';
    const params = status ? [status] : [];

    const result = await pool.query(
      `SELECT
         r.*,
         u.email AS reviewer_email,
         p.name  AS product_name
       FROM reviews r
       JOIN users    u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params,
    );
    return result.rows;
  }

  static async adminUpdateStatus(
    reviewId: number,
    status: 'approved' | 'rejected' | 'hidden',
  ): Promise<ReviewRow> {
    if (!['approved', 'rejected', 'hidden'].includes(status)) {
      throw new AppError('Invalid status value.', 400);
    }

    const result = await pool.query(
      `UPDATE reviews
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, reviewId],
    );
    if (result.rows.length === 0) throw new AppError('Review not found.', 404);

    logger.info(`🛡️  Review #${reviewId} status set to '${status}'`);

    // Notify review author if approved or rejected
    if (status === 'approved' || status === 'rejected') {
      const review = result.rows[0];
      if (review.user_id) {
        await NotificationService.createNotification({
          userId: review.user_id,
          type: status === 'approved' ? 'review_approved' : 'review_rejected',
          title: status === 'approved' ? 'Review Approved' : 'Review Not Approved',
          body: `Your review for "${review.title || 'product'}" has been ${status}.`,
          link: `/products/${review.product_id}`,
        });
      }
    }

    return result.rows[0];
  }

  static async adminListReports(reportStatus?: string) {
    const whereClause = reportStatus ? `WHERE rr.status = $1` : '';
    const params = reportStatus ? [reportStatus] : [];

    const result = await pool.query(
      `SELECT
         rr.*,
         u.email  AS reporter_email,
         r.body   AS review_body,
         r.rating AS review_rating,
         r.status AS review_status
       FROM review_reports rr
       JOIN users   u ON u.id  = rr.reporter_user_id
       JOIN reviews r ON r.id  = rr.review_id
       ${whereClause}
       ORDER BY rr.created_at DESC`,
      params,
    );
    return result.rows;
  }

  static async adminUpdateReportStatus(
    reportId: number,
    status: 'reviewed' | 'dismissed',
  ) {
    if (!['reviewed', 'dismissed'].includes(status)) {
      throw new AppError('Invalid report status value.', 400);
    }

    const result = await pool.query(
      `UPDATE review_reports SET status = $1 WHERE id = $2 RETURNING *`,
      [status, reportId],
    );
    if (result.rows.length === 0) throw new AppError('Report not found.', 404);
    return result.rows[0];
  }
}
