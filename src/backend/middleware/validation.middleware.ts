import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.ts';
// Shared source-of-truth for password rules — see file header for details.
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '../../lib/passwordRules.ts';

export const validate = (schema: Joi.ObjectSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
    if (error) {
      const msg = error.details.map(d => d.message).join(', ');
      next(new AppError(msg, 400));
      return;
    }
    next();
  };

// ── Auth schemas ──────────────────────────────────────────────────────────────
export const authSchemas = {
  register: Joi.object({
    email:      Joi.string().email().lowercase().trim().required(),
    // Password rules imported from src/lib/passwordRules.ts (single source of truth).
    // PASSWORD_PATTERN requires: 1 lowercase, 1 uppercase, 1 number, 1 special char.
    password: Joi.string()
      .min(PASSWORD_MIN_LENGTH)
      .pattern(PASSWORD_PATTERN)
      .required()
      .messages({
        'string.min':     `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      }),
    full_name:  Joi.string().min(2).max(100).trim().required(),
    avatar_url: Joi.string().uri().optional(),
  }),

  login: Joi.object({
    email:    Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),

  resetPassword: Joi.object({
    token:    Joi.string().required(),
    password: Joi.string()
      .min(PASSWORD_MIN_LENGTH)
      .pattern(PASSWORD_PATTERN)
      .required()
      .messages({
        'string.min':     `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      }),
  }),
};

// ── Product schemas ───────────────────────────────────────────────────────────
export const productSchemas = {
  create: Joi.object({
    name:           Joi.string().min(3).max(255).trim().required(),
    description:    Joi.string().min(10).max(5000).trim().required(),
    price:          Joi.number().positive().precision(2).required(),
    category:       Joi.string().valid('Skincare', 'Lip Care', 'Hair Care', 'Spa Services').required(),
    stock_quantity: Joi.number().integer().min(0).required(),
    image_url:      Joi.string().uri().optional().allow(''),
    sub:            Joi.string().max(255).optional(),
    badge:          Joi.string().valid('Best Seller', 'New', 'Premium', 'Limited', 'Sale', 'None', '').optional(),
    ingredients:    Joi.array().items(Joi.string().max(100)).max(30).optional(),
    benefits:       Joi.array().items(Joi.string().max(200)).max(20).optional(),
  }),

  update: Joi.object({
    name:           Joi.string().min(3).max(255).trim().optional(),
    description:    Joi.string().min(10).max(5000).trim().optional(),
    price:          Joi.number().positive().precision(2).optional(),
    category:       Joi.string().valid('Skincare', 'Lip Care', 'Hair Care', 'Spa Services').optional(),
    stock_quantity: Joi.number().integer().min(0).optional(),
    image_url:      Joi.string().uri().optional().allow(''),
    sub:            Joi.string().max(255).optional(),
    badge:          Joi.string().valid('Best Seller', 'New', 'Premium', 'Limited', 'Sale', 'None', '').optional(),
    ingredients:    Joi.array().items(Joi.string().max(100)).max(30).optional(),
    benefits:       Joi.array().items(Joi.string().max(200)).max(20).optional(),
  }),
};

// ── Cart schemas ──────────────────────────────────────────────────────────────
export const cartSchemas = {
  addItem: Joi.object({
    product_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
    quantity:   Joi.number().integer().min(1).max(99).required(),
  }),
  updateQuantity: Joi.object({
    quantity: Joi.number().integer().min(1).max(99).required(),
  }),
};

// ── Payment schemas ────────────────────────────────────────────────────────────
// medium is intentionally a loose string (not a strict enum) — the service
// layer itself doesn't enforce a fixed set of values and applies its own
// fallback logic (see PaymentService.initiatePayment), so over-constraining
// here risks rejecting valid requests the service would otherwise accept.
export const paymentSchemas = {
  initiate: Joi.object({
    order_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/)).required(),
    phone:    Joi.string().pattern(/^[0-9+\s-]{6,20}$/).optional().allow('', null),
    medium:   Joi.string().max(50).optional().allow('', null),
    email:    Joi.string().email().optional().allow('', null),
  }),
  refund: Joi.object({
    reason: Joi.string().max(500).optional().allow('', null),
  }),
};

// ── Coupon schemas ─────────────────────────────────────────────────────────────
export const couponSchemas = {
  validate: Joi.object({
    code:  Joi.string().max(50).required(),
    items: Joi.array().items(Joi.object({
      product_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      id:         Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      quantity:   Joi.number().optional(),
      qty:        Joi.number().optional(),
    }).unknown(true)).optional(),
  }),
  create: Joi.object({
    code:               Joi.string().max(50).required(),
    discount_type:      Joi.string().valid('percentage', 'fixed_amount').required(),
    discount_value:     Joi.alternatives().try(Joi.number().positive(), Joi.string()).required(),
    min_order_amount:   Joi.alternatives().try(Joi.number().min(0), Joi.string(), Joi.valid(null)).optional(),
    max_uses:           Joi.alternatives().try(Joi.number().integer().min(1), Joi.string(), Joi.valid(null)).optional(),
    max_uses_per_user:  Joi.alternatives().try(Joi.number().integer().min(1), Joi.string(), Joi.valid(null)).optional(),
    starts_at:          Joi.string().optional().allow('', null),
    expires_at:         Joi.string().optional().allow('', null),
    is_active:          Joi.boolean().optional(),
  }),
  update: Joi.object({
    code:               Joi.string().max(50).optional(),
    discount_type:      Joi.string().valid('percentage', 'fixed_amount').optional(),
    discount_value:     Joi.alternatives().try(Joi.number().positive(), Joi.string()).optional(),
    min_order_amount:   Joi.alternatives().try(Joi.number().min(0), Joi.string(), Joi.valid(null)).optional(),
    max_uses:           Joi.alternatives().try(Joi.number().integer().min(1), Joi.string(), Joi.valid(null)).optional(),
    max_uses_per_user:  Joi.alternatives().try(Joi.number().integer().min(1), Joi.string(), Joi.valid(null)).optional(),
    starts_at:          Joi.string().optional().allow('', null),
    expires_at:         Joi.string().optional().allow('', null),
    is_active:          Joi.boolean().optional(),
  }),
};

// ── Order schemas ──────────────────────────────────────────────────────────────
// Intentionally permissive: shipping_address/billing_address may arrive as
// either a JSON string or an object (createOrder handles both — see
// order.controller.ts), and delivery_method's enum is already validated
// with a specific error message inside the controller, so it is only
// type-checked here to avoid conflicting/duplicate error messages.
export const orderSchemas = {
  create: Joi.object({
    shipping_address: Joi.alternatives().try(Joi.string().max(2000), Joi.object().unknown(true)).optional(),
    billing_address:  Joi.alternatives().try(Joi.string().max(2000), Joi.object().unknown(true)).optional(),
    items: Joi.array().items(Joi.object({
      product_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      id:         Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      quantity:   Joi.number().optional(),
      qty:        Joi.number().optional(),
    }).unknown(true)).optional(),
    delivery_method: Joi.string().optional().allow('', null),
    agency_id:       Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow('', null),
    coupon_code:     Joi.string().max(50).optional().allow('', null),
    promo_code:      Joi.string().max(50).optional().allow('', null),
    payment_method:  Joi.string().max(50).optional().allow('', null),
  }),
};

// ── Review schemas ─────────────────────────────────────────────────────────────
export const reviewSchemas = {
  create: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title:  Joi.string().max(200).trim().optional().allow('', null),
    body:   Joi.string().min(10).max(5000).trim().required(),
  }),
  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title:  Joi.string().max(200).trim().optional().allow('', null),
    body:   Joi.string().min(10).max(5000).trim().optional(),
  }),
  report: Joi.object({
    reason: Joi.string().min(5).max(1000).trim().required(),
  }),
  adminStatus: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'hidden').required(),
  }),
  adminReportStatus: Joi.object({
    status: Joi.string().valid('reviewed', 'dismissed').required(),
  }),
};
