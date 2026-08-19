import { Response } from 'express';
import pool, { query } from '../config/db.ts';
import { CouponService } from '../services/coupon.service.ts';
import { NotificationService } from '../services/notification.service.ts';
import { ShippingService } from '../services/shipping.service.ts';
import logger from '../utils/logger.ts';

/**
 * Helper to parse tax rate setting from DB value
 */
export const parseTaxRateSetting = (value: any): number => {
  if (value === null || value === undefined) return 19.25;
  let config = value;
  if (typeof value === 'string') {
    try {
      config = JSON.parse(value);
    } catch {
      const p = parseFloat(value);
      return isNaN(p) ? 19.25 : p;
    }
  }
  if (typeof config === 'object' && config !== null) {
    if (config.rate !== undefined && config.rate !== null) {
      const parsed = parseFloat(config.rate);
      return isNaN(parsed) ? 19.25 : parsed;
    }
  }
  if (typeof config === 'number') {
    return isNaN(config) ? 19.25 : config;
  }
  return 19.25;
};

/**
 * @desc Get current tax rate (public)
 * @route GET /api/orders/tax-rate
 * @access Public
 */
export const getTaxRate = async (req: any, res: Response) => {
  try {
    const taxRateResult = await query(
      `SELECT value FROM settings WHERE key = 'tax_rate'`,
      []
    );

    let taxRate = 19.25;
    if (taxRateResult.rows.length > 0) {
      taxRate = parseTaxRateSetting(taxRateResult.rows[0].value);
    }

    // Also surface the free-shipping-threshold config so the checkout page
    // can reflect it in its pre-submit estimate (server-side createOrder
    // remains the authoritative calculation either way).
    let freeShipping = { enabled: false, amount: 0 };
    const freeShippingResult = await query(
      `SELECT value FROM settings WHERE key = 'free_shipping_threshold'`,
      []
    );
    if (freeShippingResult.rows.length > 0) {
      try {
        const freeShippingConfig = typeof freeShippingResult.rows[0].value === 'string'
          ? JSON.parse(freeShippingResult.rows[0].value)
          : freeShippingResult.rows[0].value;
        freeShipping = {
          enabled: Boolean(freeShippingConfig.enabled),
          amount: parseFloat(freeShippingConfig.amount) || 0,
        };
      } catch (error) {
        logger.error('Error parsing free shipping threshold:', error);
      }
    }

    res.json({ taxRate, freeShipping });
  } catch (error) {
    logger.error('Error fetching tax rate:', error);
    res.status(500).json({ message: 'Internal server error fetching tax rate' });
  }
};

/**
 * @desc Create order from cart
 * @route POST /api/orders
 * @access Private
 */
export const createOrder = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const {
      shipping_address,
      billing_address,
      items: bodyItems,
      delivery_method,
      agency_id,
    } = req.body;

    // Validate delivery_method — server is the authority
    const VALID_METHODS = ['local_delivery', 'agency_shipping', 'pickup'];
    if (delivery_method && !VALID_METHODS.includes(delivery_method)) {
      return res.status(400).json({ message: `Invalid delivery_method. Must be one of: ${VALID_METHODS.join(', ')}` });
    }
    const effectiveMethod: string = delivery_method || 'local_delivery';

    // Start Transaction
    await client.query('BEGIN');

    let orderItemsToProcess: Array<{ product_id: number; quantity: number; price: number }> = [];

    // 1. Get cart items: check DB cart_items first, then fallback to request body items
    const dbCartResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );

    if (dbCartResult.rows.length > 0) {
      for (const item of dbCartResult.rows) {
        if (item.stock_quantity < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Insufficient stock for product ID ${item.product_id}` });
        }
        orderItemsToProcess.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
        });
      }
    } else if (Array.isArray(bodyItems) && bodyItems.length > 0) {
      for (const item of bodyItems) {
        const productId = item.product_id || item.id;
        const qty = Number(item.quantity || item.qty || 1);

        const prodResult = await client.query(
          'SELECT id, price, stock_quantity FROM products WHERE id = $1',
          [productId]
        );

        if (prodResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Product ID ${productId} not found` });
        }

        const product = prodResult.rows[0];

        if (product.stock_quantity < qty) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Insufficient stock for product ID ${productId}` });
        }

        orderItemsToProcess.push({
          product_id: product.id,
          quantity: qty,
          price: parseFloat(product.price),
        });
      }
    }

    if (orderItemsToProcess.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Server-side amount calculation - always derived from database prices
    const totalBeforeDiscount = orderItemsToProcess.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate shipping cost — method is authoritative from server, never trust client amounts
    let shippingCost = 0;
    let addressCity: string | null = null;

    if (effectiveMethod === 'pickup') {
      // In-person pickup: zero shipping, no address required
      shippingCost = 0;
    } else {
      // For both local_delivery and agency_shipping, look up the rate by town name
      if (shipping_address) {
        try {
          const addressObj = typeof shipping_address === 'string'
            ? JSON.parse(shipping_address)
            : shipping_address;
          addressCity = addressObj?.town || addressObj?.city || null;
          if (addressCity) {
            shippingCost = await ShippingService.getShippingCost(addressCity);
          }
        } catch (error) {
          logger.error('Error resolving shipping address:', error);
        }
      }
    }

    // Validate agency_id for agency_shipping orders (graceful fallback)
    let resolvedAgencyId: number | null = null;
    if (effectiveMethod === 'agency_shipping' && agency_id) {
      const parsedAgencyId = parseInt(String(agency_id), 10);
      if (!isNaN(parsedAgencyId)) {
        const agencyCheck = await client.query(
          `SELECT id FROM agencies WHERE id = $1 AND is_active = TRUE`,
          [parsedAgencyId]
        );
        if (agencyCheck.rows.length > 0) {
          resolvedAgencyId = agencyCheck.rows[0].id;
        }
      }
    }

    // Apply coupon discount if applicable
    let couponId: number | null = null;
    let discountAmount = 0;
    const couponCode = req.body.coupon_code || req.body.promo_code;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      try {
        const val = await CouponService.validate(couponCode, totalBeforeDiscount, userId);
        couponId = val.couponId;
        discountAmount = val.discountAmount;
      } catch (err: any) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: err.message || 'Invalid coupon code' });
      }
    }

    const finalSubtotal = Math.max(0, totalBeforeDiscount - discountAmount);
    
    // Check for free shipping threshold
    const freeShippingResult = await query(
      `SELECT value FROM settings WHERE key = 'free_shipping_threshold'`,
      []
    );
    
    let effectiveShippingCost = shippingCost;
    if (freeShippingResult.rows.length > 0) {
      try {
        const freeShippingConfig = typeof freeShippingResult.rows[0].value === 'string' 
          ? JSON.parse(freeShippingResult.rows[0].value) 
          : freeShippingResult.rows[0].value;
        if (freeShippingConfig.enabled && finalSubtotal >= freeShippingConfig.amount) {
          effectiveShippingCost = 0;
        }
      } catch (error) {
        logger.error('Error parsing free shipping threshold:', error);
      }
    }
    
    // Calculate tax on subtotal (after discount but before shipping)
    const taxRateResult = await query(
      `SELECT value FROM settings WHERE key = 'tax_rate'`,
      []
    );
    
    let taxRate = 19.25;
    if (taxRateResult.rows.length > 0) {
      taxRate = parseTaxRateSetting(taxRateResult.rows[0].value);
    }
    
    const taxAmount = finalSubtotal * (taxRate / 100);
    const finalTotalAmount = finalSubtotal + effectiveShippingCost + taxAmount;
    
    // 2. Create Order in 'pending' status
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, billing_address, coupon_id, discount_amount, delivery_method, agency_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        finalTotalAmount,
        'pending',
        shipping_address ? JSON.stringify(shipping_address) : null,
        billing_address ? JSON.stringify(billing_address) : null,
        couponId,
        discountAmount,
        effectiveMethod,
        resolvedAgencyId,
      ]
    );
    const orderId = orderResult.rows[0].id;

    // 3. Save Order Items (single multi-row INSERT instead of one query per item)
    if (orderItemsToProcess.length > 0) {
      const values: unknown[] = [];
      const placeholders = orderItemsToProcess.map((item, i) => {
        const base = i * 4;
        values.push(orderId, item.product_id, item.quantity, item.price);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      }).join(', ');

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ${placeholders}`,
        values
      );
    }

    // 4. Clear DB Cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    // Commit Transaction
    await client.query('COMMIT');

    // Emit real-time event
    const { emitEvent } = await import('../utils/socket.ts');
    emitEvent('new_order', {
      order: orderResult.rows[0],
      items: orderItemsToProcess
    });

    // Send the customer's response first. The admin notification broadcast
    // below is a side-effect, not part of the customer-facing order-creation
    // contract — it must never delay or be able to fail the response the
    // customer is waiting on.
    res.status(201).json({
      message: 'Order created successfully (pending payment)',
      order: orderResult.rows[0],
      breakdown: {
        subtotal: totalBeforeDiscount,
        discount: discountAmount,
        shipping: effectiveShippingCost,
        tax: taxAmount,
        total: finalTotalAmount,
      }
    });

    // Notify admins/staff of new order — fire-and-forget. This runs after
    // the response has already been sent, and its own errors are caught
    // and logged rather than thrown, since a failure here must never be
    // able to affect a response the customer has already received.
    NotificationService.createForPermissionHolders(
      'orders:view',
      'new_order',
      'New Order Received',
      `Order #${orderId} placed for ${finalTotalAmount.toLocaleString('fr-CM')} XAF (Shipping: ${effectiveShippingCost.toLocaleString('fr-CM')} XAF, Tax: ${taxAmount.toLocaleString('fr-CM')} XAF)`,
      `/admin/orders/${orderId}`
    ).catch((err) => {
      logger.error('Failed to notify admins of new order', {
        orderId,
        error: err instanceof Error ? err.message : err,
      });
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Order creation error:', error);
    res.status(500).json({ message: 'Internal server error during checkout' });
  } finally {
    client.release();
  }
};

/**
 * @desc Get user orders
 * @route GET /api/orders
 * @access Private
 */
export const getOrders = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const queryStr = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        o.shipping_address,
        o.discount_amount,
        json_agg(
          json_build_object(
            'id', oi.product_id,
            'product_id', oi.product_id,
            'name', p.name,
            'img', p.image_url,
            'quantity', oi.quantity,
            'qty', oi.quantity,
            'price', oi.price_at_purchase
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(queryStr, [userId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error fetching orders' });
  }
};

/**
 * @desc Get order details by ID
 * @route GET /api/orders/:id
 * @access Private
 */
export const getOrderById = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const cleanId = String(req.params.id).replace(/^CS-/, '');
    const orderId = parseInt(cleanId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const queryStr = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        o.shipping_address,
        o.billing_address,
        o.discount_amount,
        o.payment_id,
        pm.method as payment_method,
        json_agg(
          json_build_object(
            'id', oi.product_id,
            'product_id', oi.product_id,
            'name', p.name,
            'img', p.image_url,
            'quantity', oi.quantity,
            'qty', oi.quantity,
            'price', oi.price_at_purchase
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments pm ON o.payment_id = pm.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id, pm.method
    `;

    const result = await pool.query(queryStr, [orderId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = result.rows[0];
    res.json(order);
  } catch (error) {
    logger.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Internal server error fetching order details' });
  }
};

/**
 * @desc Get shipping cost for a city
 * @route GET /api/shipping/cost?city=Douala
 * @access Public
 */
export const getShippingCost = async (req: any, res: Response) => {
  try {
    const { city } = req.query;

    if (!city || typeof city !== 'string') {
      return res.status(400).json({ message: 'City parameter is required' });
    }

    const { ShippingService } = await import('../services/shipping.service.ts');
    const cost = await ShippingService.getShippingCost(city);

    res.json({ city, cost });
  } catch (error) {
    logger.error('Error calculating shipping cost:', error);
    res.status(500).json({ message: 'Internal server error calculating shipping' });
  }
};