import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { PermissionRequest } from '../middleware/admin.middleware.ts';
import { PaymentService } from '../services/payment.service.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';

/**
 * @desc Initiate payment for an order
 * @route POST /api/payments/initiate
 * @access Private (Customer owner of order)
 */
export const initiatePaymentController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { order_id, phone, medium, email } = req.body;

    if (!order_id) {
      throw new AppError('order_id is required', 400);
    }

    const result = await PaymentService.initiatePayment(
      userId,
      Number(order_id),
      phone,
      medium,
      email || req.user?.email
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Public Webhook Callback Endpoint
 * @route POST /api/payments/webhook
 * @access Public (Requires x-wh-secret signature header)
 */
export const handleWebhookController = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Unconditional proof-of-arrival log line BEFORE any signature check or processing.
  // Sensitive headers are stripped before logging — the full, unredacted
  // req.headers is still passed to PaymentService.processWebhook below for
  // actual signature verification.
  const { 'x-wh-secret': _whSecret, 'x-fapshi-signature': _whSig, 'x-wh-signature': _whSig2, authorization: _auth, cookie: _cookie, ...safeHeaders } = req.headers;

  logger.info('🔔 Webhook endpoint hit (raw call received)', {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: safeHeaders,
    hasRawBody: Boolean(req.rawBody),
    ip: req.ip || req.headers['x-forwarded-for'],
  });

  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const result = await PaymentService.processWebhook(req.headers, rawBody, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get payment status of an order
 * @route GET /api/payments/:orderId/status
 * @access Private (Order owner or Admin)
 */
export const getPaymentStatusController = async (
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { orderId } = req.params;
    if (!orderId) throw new AppError('Order ID parameter is required', 400);

    const userPermissions = req.userPermissions || [];
    const result = await PaymentService.getPaymentStatus(Number(orderId), userId, userPermissions);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin Payment Refund
 * @route POST /api/admin/payments/:paymentId/refund
 * @access Private (Admin/Manager with payments:refund permission)
 */
export const refundPaymentController = async (
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) throw new AppError('Unauthorized', 401);

    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!paymentId) throw new AppError('paymentId parameter is required', 400);

    const result = await PaymentService.refundPayment(Number(paymentId), adminUserId, reason);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
