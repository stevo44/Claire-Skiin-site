import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { validate, paymentSchemas } from '../middleware/validation.middleware.ts';
import {
  initiatePaymentController,
  handleWebhookController,
  getPaymentStatusController,
} from '../controllers/payment.controller.ts';

const router = Router();

// Public Webhook Route (No Auth token middleware, signature verified internally).
// Intentionally NOT schema-validated — its payload shape comes from the
// external payment provider, and the real "validation" here is the
// signature/secret verification performed inside PaymentService.processWebhook.
router.post('/webhook', handleWebhookController);

// Authenticated Routes
router.post('/initiate', authenticateToken, validate(paymentSchemas.initiate), initiatePaymentController);
router.get('/:orderId/status', authenticateToken, getPaymentStatusController);

export { router as paymentRouter };
