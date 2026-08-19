import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';

export interface CouponRow {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ValidateResult {
  couponId: number;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  discountAmount: number; // actual XAF discount to apply
  finalTotal: number;     // cart_total - discountAmount
}

export class CouponService {
  /**
   * Validate a coupon code against a server-computed cart total.
   * Returns the concrete discount amount on success.
   * Throws AppError with a specific user-facing message on any failure.
   *
   * NOTE: cart_total MUST be computed server-side (fetched from DB order rows),
   * not trusted from the client. The caller is responsible for this.
   */
  static async validate(
    code: string,
    cartTotal: number,
    userId: number | null,
  ): Promise<ValidateResult> {
    // 1. Look up the coupon (case-insensitive: codes stored uppercased)
    const result = await pool.query<CouponRow>(
      `SELECT * FROM coupons WHERE code = UPPER($1)`,
      [code.trim()],
    );

    if (result.rows.length === 0) {
      throw new AppError('Coupon code not found.', 404);
    }

    const coupon = result.rows[0];

    // 2. Active check
    if (!coupon.is_active) {
      throw new AppError('This coupon is no longer active.', 400);
    }

    // 3. Date window check
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      throw new AppError('This coupon is not yet valid.', 400);
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      throw new AppError('This coupon has expired.', 400);
    }

    // 4. Minimum order amount
    if (coupon.min_order_amount !== null && cartTotal < Number(coupon.min_order_amount)) {
      const minFormatted = Number(coupon.min_order_amount).toLocaleString('fr-CM');
      throw new AppError(
        `A minimum order of ${minFormatted} XAF is required for this coupon.`,
        400,
      );
    }

    // 5. Global max_uses check — counts confirmed redemptions AND active pending reservations
    if (coupon.max_uses !== null) {
      const usageRes = await pool.query(
        `SELECT 
           (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = $1) +
           (SELECT COUNT(*) FROM orders WHERE coupon_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '30 minutes')
         AS total_reserved`,
        [coupon.id],
      );
      const totalReserved = parseInt(usageRes.rows[0].total_reserved, 10);
      if (totalReserved >= coupon.max_uses) {
        throw new AppError('This coupon has reached its maximum redemption limit.', 400);
      }
    }

    // 6. Per-user max_uses_per_user check (skip for guest/null userId)
    if (coupon.max_uses_per_user !== null && userId !== null) {
      const userUsageRes = await pool.query(
        `SELECT 
           (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2) +
           (SELECT COUNT(*) FROM orders WHERE coupon_id = $1 AND user_id = $2 AND status = 'pending' AND created_at > NOW() - INTERVAL '30 minutes')
         AS total_reserved`,
        [coupon.id, userId],
      );
      const userReserved = parseInt(userUsageRes.rows[0].total_reserved, 10);
      if (userReserved >= coupon.max_uses_per_user) {
        throw new AppError('You have already used this coupon the maximum number of times.', 400);
      }
    }

    // 7. Compute the actual discount XAF amount
    let discountAmount: number;
    const discountValue = Number(coupon.discount_value);

    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(cartTotal * (discountValue / 100));
    } else {
      // fixed_amount — never discount more than the cart total
      discountAmount = Math.min(discountValue, cartTotal);
    }

    const finalTotal = Math.max(0, cartTotal - discountAmount);

    logger.info(`✅ Coupon ${coupon.code} validated for user ${userId}: -${discountAmount} XAF (cart: ${cartTotal})`);

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue,
      discountAmount,
      finalTotal,
    };
  }

  /**
   * Record a redemption AFTER an order has been confirmed as paid.
   * Called by payment.service.ts inside applyStateTransition (SUCCESSFUL branch).
   * Thread-safe with FOR UPDATE lock on coupons table to strictly prevent over-subscription.
   */
  static async recordRedemption(
    couponId: number,
    userId: number | null,
    orderId: number,
    discountApplied: number,
    client?: any,
  ): Promise<void> {
    const db = client || pool;

    // Check max_uses atomically with FOR UPDATE lock
    const couponRes = await db.query(
      `SELECT max_uses FROM coupons WHERE id = $1 FOR UPDATE`,
      [couponId]
    );

    if (couponRes.rows.length > 0 && couponRes.rows[0].max_uses !== null) {
      const maxUses = couponRes.rows[0].max_uses;
      const countRes = await db.query(
        `SELECT COUNT(*) AS cnt FROM coupon_redemptions WHERE coupon_id = $1`,
        [couponId]
      );
      const currentCount = parseInt(countRes.rows[0].cnt, 10);
      if (currentCount >= maxUses) {
        logger.warn(`⚠️ Coupon #${couponId} max_uses (${maxUses}) reached. Skipping redemption record for order #${orderId}`);
        return;
      }
    }

    await db.query(
      `INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_applied)
       VALUES ($1, $2, $3, $4)`,
      [couponId, userId, orderId, discountApplied],
    );
    logger.info(`📋 Coupon redemption recorded: coupon #${couponId}, order #${orderId}`);
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────

  /** List all coupons with live usage stats */
  static async listAll() {
    const result = await pool.query(`
      SELECT
        c.*,
        COALESCE(r.redemption_count, 0) AS redemption_count
      FROM coupons c
      LEFT JOIN (
        SELECT coupon_id, COUNT(*) AS redemption_count
        FROM coupon_redemptions
        GROUP BY coupon_id
      ) r ON r.coupon_id = c.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  }

  /** Create a new coupon (code is uppercased automatically) */
  static async create(data: {
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    min_order_amount?: number | null;
    max_uses?: number | null;
    max_uses_per_user?: number | null;
    starts_at?: string | null;
    expires_at?: string | null;
    is_active?: boolean;
  }) {
    const result = await pool.query(
      `INSERT INTO coupons
         (code, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_user, starts_at, expires_at, is_active)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.code.trim(),
        data.discount_type,
        data.discount_value,
        data.min_order_amount ?? null,
        data.max_uses ?? null,
        data.max_uses_per_user ?? null,
        data.starts_at ?? null,
        data.expires_at ?? null,
        data.is_active !== undefined ? data.is_active : true,
      ],
    );
    return result.rows[0];
  }

  /** Update a coupon (code uppercased if changed) */
  static async update(
    id: number,
    data: Partial<{
      code: string;
      discount_type: 'percentage' | 'fixed_amount';
      discount_value: number;
      min_order_amount: number | null;
      max_uses: number | null;
      max_uses_per_user: number | null;
      starts_at: string | null;
      expires_at: string | null;
      is_active: boolean;
    }>,
  ) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.code !== undefined) { sets.push(`code = UPPER($${idx++})`); values.push(data.code.trim()); }
    if (data.discount_type !== undefined) { sets.push(`discount_type = $${idx++}`); values.push(data.discount_type); }
    if (data.discount_value !== undefined) { sets.push(`discount_value = $${idx++}`); values.push(data.discount_value); }
    if ('min_order_amount' in data) { sets.push(`min_order_amount = $${idx++}`); values.push(data.min_order_amount); }
    if ('max_uses' in data) { sets.push(`max_uses = $${idx++}`); values.push(data.max_uses); }
    if ('max_uses_per_user' in data) { sets.push(`max_uses_per_user = $${idx++}`); values.push(data.max_uses_per_user); }
    if ('starts_at' in data) { sets.push(`starts_at = $${idx++}`); values.push(data.starts_at); }
    if ('expires_at' in data) { sets.push(`expires_at = $${idx++}`); values.push(data.expires_at); }
    if (data.is_active !== undefined) { sets.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (sets.length === 0) throw new AppError('No fields to update', 400);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE coupons SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) throw new AppError('Coupon not found', 404);
    return result.rows[0];
  }

  /**
   * Soft-delete: sets is_active = false.
   * Hard-delete is intentionally not supported to preserve coupon_redemptions audit trail.
   */
  static async deactivate(id: number) {
    const result = await pool.query(
      `UPDATE coupons SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) throw new AppError('Coupon not found', 404);
    return result.rows[0];
  }
}
