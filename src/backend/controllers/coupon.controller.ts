import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { CouponService } from '../services/coupon.service.ts';
import { AppError } from '../middleware/error.middleware.ts';
import pool from '../config/db.ts';

/**
 * POST /api/coupons/validate
 * Authenticated. Validates a coupon against the caller's real cart total from DB.
 */
export const validateCouponController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id ?? null;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new AppError('Coupon code is required.', 400);
    }

    // Server-side cart total: never trust the client-supplied amount.
    // If user is authenticated, compute from DB cart_items joined with product prices.
    // If no DB cart exists (client-only cart pattern), fall back to items[] in request body.
    let cartTotal = 0;

    if (userId) {
      const cartRes = await pool.query(
        `SELECT SUM(p.price * ci.quantity) AS total
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = $1`,
        [userId],
      );
      cartTotal = parseFloat(cartRes.rows[0]?.total ?? '0') || 0;
    }

    // Fallback: client sends items[] when using the localStorage-only cart
    // (current pattern: cart lives in localStorage, not DB cart_items for this project)
    if (cartTotal === 0 && Array.isArray(req.body.items) && req.body.items.length > 0) {
      // Re-verify prices server-side — pull from DB
      const productIds = req.body.items.map((i: any) => Number(i.product_id || i.id)).filter(Boolean);
      if (productIds.length > 0) {
        const priceRes = await pool.query(
          `SELECT id, price FROM products WHERE id = ANY($1::int[])`,
          [productIds],
        );
        const priceMap = new Map(priceRes.rows.map((r: any) => [r.id, parseFloat(r.price)]));
        for (const item of req.body.items) {
          const pid = Number(item.product_id || item.id);
          const qty = Number(item.quantity || item.qty || 1);
          const price = priceMap.get(pid) ?? 0;
          cartTotal += price * qty;
        }
      }
    }

    if (cartTotal <= 0) {
      throw new AppError('Cart is empty or could not be computed.', 400);
    }

    const result = await CouponService.validate(code, cartTotal, userId);

    res.status(200).json({
      success: true,
      message: `Coupon applied — you save ${result.discountAmount.toLocaleString('fr-CM')} XAF!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin Controllers ────────────────────────────────────────────────────────

export const listCouponsController = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupons = await CouponService.listAll();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) { next(error); }
};

export const createCouponController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      code, discount_type, discount_value,
      min_order_amount, max_uses, max_uses_per_user,
      starts_at, expires_at, is_active,
    } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      throw new AppError('code, discount_type, and discount_value are required.', 400);
    }
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      throw new AppError("discount_type must be 'percentage' or 'fixed_amount'.", 400);
    }
    if (Number(discount_value) <= 0) {
      throw new AppError('discount_value must be greater than 0.', 400);
    }
    if (discount_type === 'percentage' && Number(discount_value) > 100) {
      throw new AppError('Percentage discount cannot exceed 100.', 400);
    }

    const coupon = await CouponService.create({
      code, discount_type, discount_value: Number(discount_value),
      min_order_amount: min_order_amount ? Number(min_order_amount) : null,
      max_uses: max_uses ? Number(max_uses) : null,
      max_uses_per_user: max_uses_per_user ? Number(max_uses_per_user) : null,
      starts_at: starts_at || null,
      expires_at: expires_at || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) { next(error); }
};

export const updateCouponController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('Invalid coupon ID', 400);

    const {
      code, discount_type, discount_value,
      min_order_amount, max_uses, max_uses_per_user,
      starts_at, expires_at, is_active,
    } = req.body;

    const updates: any = {};
    if (code !== undefined) updates.code = code;
    if (discount_type !== undefined) updates.discount_type = discount_type;
    if (discount_value !== undefined) updates.discount_value = Number(discount_value);
    if ('min_order_amount' in req.body) updates.min_order_amount = min_order_amount ? Number(min_order_amount) : null;
    if ('max_uses' in req.body) updates.max_uses = max_uses ? Number(max_uses) : null;
    if ('max_uses_per_user' in req.body) updates.max_uses_per_user = max_uses_per_user ? Number(max_uses_per_user) : null;
    if ('starts_at' in req.body) updates.starts_at = starts_at || null;
    if ('expires_at' in req.body) updates.expires_at = expires_at || null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const coupon = await CouponService.update(id, updates);
    res.status(200).json({ success: true, data: coupon });
  } catch (error) { next(error); }
};

/**
 * DELETE /api/admin/coupons/:id
 * Soft-deletes (sets is_active=false). Hard delete rejected to preserve audit trail.
 */
export const deactivateCouponController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('Invalid coupon ID', 400);

    const coupon = await CouponService.deactivate(id);
    res.status(200).json({
      success: true,
      message: 'Coupon deactivated successfully.',
      data: coupon,
    });
  } catch (error) { next(error); }
};
