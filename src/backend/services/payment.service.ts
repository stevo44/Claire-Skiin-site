import crypto from 'crypto';
import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';
import { emitEvent } from '../utils/socket.ts';
import { CouponService } from './coupon.service.ts';
import { NotificationService } from './notification.service.ts';

// Fail fast in production: never process webhooks without a configured
// verification secret. In non-production environments we keep the warn-and-
// proceed behavior so local development / tests don't break.
if (process.env.NODE_ENV === 'production' && !process.env.FAPSHI_WEBHOOK_SECRET) {
  throw new Error('❌ FATAL: FAPSHI_WEBHOOK_SECRET must be set in production.');
}

/**
 * Constant-time string comparison to prevent timing attacks on secret/signature checks.
 * Guards the length check before calling timingSafeEqual, since it throws on
 * mismatched buffer lengths (which would itself be a variable-time signal).
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export class PaymentService {
  /**
   * Internal helper: apply payment state transition (paid/failed) & stock decrement
   * Used by both Webhook handler (after signature check) and Status Polling fallback sync.
   */
  public static async applyStateTransition(payment: any, newStatus: string, payload: any) {
    const status = newStatus ? String(newStatus).toUpperCase() : '';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Re-fetch and lock the row inside the transaction. This closes a
      // race condition where the webhook handler and the frontend's
      // payment-status polling could each independently read the payment
      // row while it was still 'pending' and both pass a stale idempotency
      // check before either committed — each one would then fire its own
      // notification (previously observed as duplicate notifications on a
      // single order). FOR UPDATE blocks any concurrent transaction from
      // reading this row until this one commits or rolls back, so a second
      // concurrent caller will see the post-transition status once it
      // acquires the lock and correctly skip.
      const lockedResult = await client.query(
        'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
        [payment.id]
      );
      const lockedPayment = lockedResult.rows[0];

      if (!lockedPayment) {
        await client.query('ROLLBACK');
        throw new AppError('Payment not found', 404);
      }

      if (lockedPayment.status === 'successful' || lockedPayment.status === 'failed' || lockedPayment.status === 'refunded') {
        await client.query('ROLLBACK');
        logger.info(`Payment state transition skip: Payment #${payment.id} already in terminal state (${lockedPayment.status})`);
        return {
          message: 'Payment already processed (idempotent)',
          status: lockedPayment.status,
          orderId: lockedPayment.order_id,
        };
      }

      if (status === 'SUCCESSFUL') {
        // Update payment status
        await client.query(
          `UPDATE payments 
           SET status = 'successful', raw_response = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [JSON.stringify(payload), payment.id]
        );

        // Update order status
        await client.query(
          `UPDATE orders 
           SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [payment.order_id]
        );

        // Decrement product stock for items in this order
        await client.query(
          `UPDATE products 
           SET stock_quantity = GREATEST(0, products.stock_quantity - oi.quantity)
           FROM order_items oi
           WHERE products.id = oi.product_id AND oi.order_id = $1`,
          [payment.order_id]
        );

        // Record coupon redemption if a coupon was applied to this order
        const orderCouponRes = await client.query(
          `SELECT coupon_id, discount_amount, user_id FROM orders WHERE id = $1`,
          [payment.order_id],
        );
        const orderRow = orderCouponRes.rows[0];
        if (orderRow?.coupon_id && Number(orderRow.discount_amount) > 0) {
          await CouponService.recordRedemption(
            orderRow.coupon_id,
            orderRow.user_id ?? null,
            payment.order_id,
            Number(orderRow.discount_amount),
            client,
          );
        }

        await client.query('COMMIT');

        logger.info(`Payment #${payment.id} set to SUCCESSFUL. Order #${payment.order_id} marked as PAID.`);

        // Real-time notification push
        emitEvent('payment_status_changed', {
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'paid',
        });
        emitEvent('order_updated', {
          orderId: payment.order_id,
          status: 'paid',
        });

        // Notify customer via notification system
        const orderRes = await client.query('SELECT user_id FROM orders WHERE id = $1', [payment.order_id]);
        const orderUser = orderRes.rows[0];
        if (orderUser?.user_id) {
          await NotificationService.createNotification({
            userId: orderUser.user_id,
            type: 'order_status_changed',
            title: 'Order Confirmed',
            body: `Your order #${payment.order_id} has been confirmed and payment received.`,
            link: `/orders/${payment.order_id}`,
            sendEmail: true,
            emailSubject: 'Order Confirmed - Claire Skiin',
            emailText: `Hi,\n\nYour order #${payment.order_id} has been confirmed and payment received. We'll begin preparing your items shortly.\n\nThank you for shopping with Claire Skiin!`,
          });
        }

        return { received: true, status: 'successful', orderId: payment.order_id };
      } else if (status === 'FAILED' || status === 'EXPIRED') {
        await client.query(
          `UPDATE payments 
           SET status = 'failed', raw_response = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [JSON.stringify(payload), payment.id]
        );

        await client.query(
          `UPDATE orders 
           SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [payment.order_id]
        );

        await client.query('COMMIT');

        logger.info(`Payment #${payment.id} set to FAILED/EXPIRED. Order #${payment.order_id} marked as FAILED.`);

        emitEvent('payment_status_changed', {
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'failed',
        });

        // Notify customer of failed payment
        const orderRes = await client.query('SELECT user_id FROM orders WHERE id = $1', [payment.order_id]);
        const orderUser = orderRes.rows[0];
        if (orderUser?.user_id) {
          await NotificationService.createNotification({
            userId: orderUser.user_id,
            type: 'order_status_changed',
            title: 'Payment Failed',
            body: `Payment for order #${payment.order_id} could not be processed. Please try again.`,
            link: `/orders/${payment.order_id}`,
          });
        }

        return { received: true, status: 'failed', orderId: payment.order_id };
      } else {
        await client.query('ROLLBACK');
        return { received: true, status: lockedPayment.status, message: `Ignored status ${status}` };
      }
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  }

  /**
   * Initiate a Fapshi payment for a pending order
   */
  static async initiatePayment(
    userId: number,
    orderId: number,
    phone?: string,
    medium?: string,
    email?: string
  ) {
    // 1. Fetch order and verify ownership & status
    const orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const orderResult = await pool.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];

    if (order.user_id !== userId) {
      throw new AppError('Unauthorized access to this order', 403);
    }

    if (order.status === 'paid') {
      throw new AppError('Order has already been paid', 400);
    }

    // 2. Check if a successful payment already exists for this order
    const existingPayment = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1 AND status = 'successful'",
      [orderId]
    );
    if (existingPayment.rows.length > 0) {
      throw new AppError('A successful payment already exists for this order', 400);
    }

    // Server-side amount lookup — NEVER trust client amount
    const amount = Math.round(parseFloat(order.total_amount));
    if (isNaN(amount) || amount < 100) {
      throw new AppError('Invalid order total amount for payment (minimum 100 XAF)', 400);
    }

    // Fapshi API Config
    const baseUrl = process.env.FAPSHI_BASE_URL || 'https://sandbox.fapshi.com';
    const apiUser = process.env.FAPSHI_API_USER;
    const apiKey = process.env.FAPSHI_API_KEY;

    let transId: string;
    let redirectUrl: string | undefined;
    let gatewayResponse: any = {};

    // 3. Call Fapshi API (or sandbox fallback if keys are missing in dev)
    if (apiUser && apiKey) {
      try {
        const isDirectPay = Boolean(phone && phone.trim());
        const endpoint = isDirectPay
          ? `${baseUrl.replace(/\/$/, '')}/direct-pay`
          : `${baseUrl.replace(/\/$/, '')}/initiate-pay`;

        const requestBody = isDirectPay
          ? {
              amount,
              phone: phone?.replace(/[\s\-().]/g, ''),
              medium: medium || (phone?.startsWith('69') || phone?.startsWith('655') ? 'orange money' : 'mobile money'),
              email,
              userId: String(userId),
              externalId: String(orderId),
              message: `Claire Skiin Order #${orderId}`,
            }
          : {
              amount,
              email,
              redirectUrl: `${process.env.SHARED_APP_URL || 'http://localhost:5173'}/order-confirmed?orderId=${orderId}`,
              userId: String(userId),
              externalId: String(orderId),
              message: `Claire Skiin Order #${orderId}`,
            };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apiuser: apiUser,
            apikey: apiKey,
          },
          body: JSON.stringify(requestBody),
        });

        gatewayResponse = await response.json();

        if (!response.ok || (gatewayResponse.message && gatewayResponse.message.toLowerCase().includes('fail'))) {
          logger.error('Fapshi initiation API error:', gatewayResponse);
          throw new AppError(gatewayResponse.message || 'Payment initiation failed with gateway', 400);
        }

        transId = gatewayResponse.transId;
        redirectUrl = gatewayResponse.link;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        logger.error('Fapshi HTTP request error:', err);
        throw new AppError(`Payment gateway error: ${err.message}`, 502);
      }
    } else {
      // Mock mode fallback when gateway credentials are not configured in local environment
      logger.info(`[FAPSHI MOCK MODE] Initiating payment for order #${orderId}, amount: ${amount} XAF`);
      transId = `CS_MOCK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      gatewayResponse = {
        message: 'Mock payment initiated successfully',
        transId,
        dateInitiated: new Date().toISOString(),
      };
    }

    // 4. Save pending record into payments table
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, provider, provider_reference, amount, currency, status, method, raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orderId,
        userId,
        'fapshi',
        transId,
        amount,
        'XAF',
        'pending',
        medium || (phone ? 'mobile_money' : 'hosted_link'),
        JSON.stringify(gatewayResponse),
      ]
    );

    const payment = paymentResult.rows[0];

    // 5. Update payment_id in orders
    await pool.query('UPDATE orders SET payment_id = $1 WHERE id = $2', [payment.id, orderId]);

    logger.info(`Payment initiated for Order #${orderId}, Payment ID: ${payment.id}, TransID: ${transId}`);

    return {
      message: 'Payment initiated successfully. Please complete authorization on your phone.',
      paymentId: payment.id,
      providerReference: transId,
      status: payment.status,
      redirectUrl,
    };
  }

  /**
   * Process Fapshi Webhook Notification
   * Verifies signature before DB interaction & enforces idempotency
   */
  static async processWebhook(headers: Record<string, any>, rawBody: string | Buffer, payload: any) {
    const webhookSecret = process.env.FAPSHI_WEBHOOK_SECRET;

    // 1. Signature Verification
    const receivedSecret = headers['x-wh-secret'] || headers['X-WH-SECRET'];
    const receivedSignature = headers['x-fapshi-signature'] || headers['x-wh-signature'];

    if (webhookSecret) {
      let isVerified = false;

      // Check header token match (constant-time to prevent timing attacks)
      if (receivedSecret && safeCompare(receivedSecret, webhookSecret)) {
        isVerified = true;
      }

      // Check HMAC-SHA512 match if signature header supplied (constant-time)
      if (!isVerified && receivedSignature && rawBody) {
        const computedHmacHex = crypto
          .createHmac('sha512', webhookSecret)
          .update(rawBody)
          .digest('hex');
        const computedHmacBase64 = crypto
          .createHmac('sha512', webhookSecret)
          .update(rawBody)
          .digest('base64');

        if (safeCompare(receivedSignature, computedHmacHex) || safeCompare(receivedSignature, computedHmacBase64)) {
          isVerified = true;
        }
      }

      if (!isVerified) {
        const { 'x-wh-secret': _s, 'x-fapshi-signature': _sig, 'x-wh-signature': _sig2, authorization: _auth, cookie: _cookie, ...safeHeaders } = headers;
        logger.warn('⚠️ Webhook rejected: Invalid signature or secret match', {
          headers: safeHeaders,
          ip: headers['x-forwarded-for'],
        });
        throw new AppError('Unauthorized: Webhook signature verification failed', 401);
      }
    } else {
      logger.warn('⚠️ FAPSHI_WEBHOOK_SECRET is not set in environment. Webhook processed without signature check.');
    }

    // 2. Extract transaction parameters
    const transId = payload.transId || payload.externalId;
    const status = payload.status ? String(payload.status).toUpperCase() : '';

    logger.info(`Webhook event received: transId=${transId}, status=${status}`);

    if (!transId) {
      throw new AppError('Invalid webhook payload: missing transaction identifier', 400);
    }

    // 3. Find payment record by provider_reference or order_id
    const paymentQuery = `
      SELECT p.*, o.user_id as order_user_id 
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.provider_reference = $1 OR p.order_id::text = $2
      ORDER BY p.created_at DESC
    `;
    const paymentResult = await pool.query(paymentQuery, [transId, transId]);

    if (paymentResult.rows.length === 0) {
      logger.error(`Webhook target payment record not found for transId: ${transId}`);
      throw new AppError(`Payment record not found for reference ${transId}`, 404);
    }

    const payment = paymentResult.rows[0];

    // 4. Apply state transition
    return await this.applyStateTransition(payment, status, payload);
  }

  /**
   * Query Payment Status for an order (allows frontend polling & sync with Fapshi REST API)
   */
  static async getPaymentStatus(orderId: number, userId: number, userPermissions: string[] = []) {
    const orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const orderResult = await pool.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];
    const isAdminOrStaff = userPermissions.includes('orders:view');

    if (order.user_id !== userId && !isAdminOrStaff) {
      throw new AppError('Unauthorized access to this order status', 403);
    }

    // Get payment details
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    const payment = paymentResult.rows[0] || null;

    // Direct REST API sync with Fapshi if pending and provider reference exists
    if (payment && payment.status === 'pending' && payment.provider_reference) {
      const baseUrl = process.env.FAPSHI_BASE_URL || 'https://sandbox.fapshi.com';
      const apiUser = process.env.FAPSHI_API_USER;
      const apiKey = process.env.FAPSHI_API_KEY;

      if (apiUser && apiKey && !payment.provider_reference.startsWith('CS_MOCK_')) {
        try {
          const statusRes = await fetch(
            `${baseUrl.replace(/\/$/, '')}/payment-status/${payment.provider_reference}`,
            {
              headers: { apiuser: apiUser, apikey: apiKey },
            }
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const fetchedStatus = statusData.status ? String(statusData.status).toUpperCase() : '';
            
            if (fetchedStatus === 'SUCCESSFUL' || fetchedStatus === 'FAILED' || fetchedStatus === 'EXPIRED') {
              await this.applyStateTransition(payment, fetchedStatus, statusData);
              payment.status = fetchedStatus === 'SUCCESSFUL' ? 'successful' : 'failed';
              order.status = fetchedStatus === 'SUCCESSFUL' ? 'paid' : 'failed';
            }
          }
        } catch (syncErr) {
          logger.warn(`Failed to sync payment status with Fapshi API: ${syncErr}`);
        }
      }
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: payment ? payment.status : 'uninitiated',
      providerReference: payment ? payment.provider_reference : null,
      payment,
    };
  }

  /**
   * Refund a successful payment (Admin only endpoint)
   * Note: Fapshi API does not have an automated merchant refund endpoint;
   * records the state internally and notes manual disbursement requirement.
   */
  static async refundPayment(paymentId: number, adminUserId: number, reason?: string) {
    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);

    if (paymentResult.rows.length === 0) {
      throw new AppError('Payment record not found', 404);
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'successful') {
      throw new AppError(`Cannot refund payment in '${payment.status}' state. Only 'successful' payments can be refunded.`, 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRaw = typeof payment.raw_response === 'object' ? payment.raw_response : {};
      const updatedRaw = {
        ...existingRaw,
        refund_details: {
          refunded_at: new Date().toISOString(),
          refunded_by_user: adminUserId,
          reason: reason || 'Admin requested refund',
        },
      };

      // Update payment
      await client.query(
        `UPDATE payments 
         SET status = 'refunded', raw_response = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [JSON.stringify(updatedRaw), paymentId]
      );

      // Update order
      await client.query(
        `UPDATE orders 
         SET status = 'refunded', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [payment.order_id]
      );

      await client.query('COMMIT');

      logger.info(`Payment #${paymentId} (Order #${payment.order_id}) refunded by Admin #${adminUserId}`);

      emitEvent('order_updated', {
        orderId: payment.order_id,
        status: 'refunded',
      });

      // Notify customer of refund
      const orderRes = await client.query('SELECT user_id FROM orders WHERE id = $1', [payment.order_id]);
      const orderUser = orderRes.rows[0];
      if (orderUser?.user_id) {
        await NotificationService.createNotification({
          userId: orderUser.user_id,
          type: 'order_status_changed',
          title: 'Refund Processed',
          body: `A refund has been processed for order #${payment.order_id}.`,
          link: `/orders/${payment.order_id}`,
          sendEmail: true,
          emailSubject: 'Refund Processed - Claire Skiin',
          emailText: `Hi,\n\nA refund has been processed for your order #${payment.order_id}.\n\nIf you have any questions, please contact our support team.\n\nThank you for shopping with Claire Skiin!`,
        });
      }

      return {
        message:
          'Payment successfully recorded as refunded. NOTE: Fapshi API does not support automated merchant-to-customer programmatic refunds; the actual money refund must be completed manually or via Fapshi payout API.',
        paymentId: payment.id,
        orderId: payment.order_id,
        status: 'refunded',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
