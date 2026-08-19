import crypto from 'crypto';
import { PaymentService } from '../src/backend/services/payment.service';
import { initDatabase } from '../src/backend/config/initDb';
import pool from '../src/backend/config/db';

async function runPaymentTests() {
  console.log('🧪 Running Phase 2 — Real Payment Integration Unit & System Tests...');
  await initDatabase();

  let testUserId: number | null = null;
  let testOrderId: number | null = null;
  let testPaymentId: number | null = null;
  const mockTransId = `TEST_WH_${Date.now()}`;

  try {
    // 1. Setup Test User and Order
    const userRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ('Test Payment User', 'payment_test_${Date.now()}@example.com', 'hashed_pw')
       RETURNING id`
    );
    testUserId = userRes.rows[0].id;

    const orderRes = await pool.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [testUserId, 15000.00]
    );
    testOrderId = orderRes.rows[0].id;

    console.log(`✅ Test Setup Complete (User ID: ${testUserId}, Order ID: ${testOrderId})`);

    // 2. Test Payment Initiation
    console.log('Step 1: Testing Payment Initiation...');
    const initRes = await PaymentService.initiatePayment(
      testUserId,
      testOrderId,
      '677123456',
      'mobile money',
      'payment_test@example.com'
    );

    if (!initRes.paymentId || !initRes.providerReference) {
      throw new Error('Payment initiation failed to return paymentId or providerReference');
    }
    testPaymentId = initRes.paymentId;
    console.log(`✅ Payment Initiation Passed (Payment ID: ${testPaymentId}, Provider Ref: ${initRes.providerReference})`);

    // 3. Test Webhook Signature Rejection
    console.log('Step 2: Testing Webhook Invalid Signature Rejection...');
    process.env.FAPSHI_WEBHOOK_SECRET = 'super_secret_key_123';
    
    try {
      await PaymentService.processWebhook(
        { 'x-wh-secret': 'WRONG_SECRET' },
        JSON.stringify({ transId: initRes.providerReference, status: 'SUCCESSFUL' }),
        { transId: initRes.providerReference, status: 'SUCCESSFUL' }
      );
      throw new Error('Webhook should have rejected invalid signature, but it passed!');
    } catch (err: any) {
      if (err.statusCode === 401 || err.message.includes('signature verification failed')) {
        console.log('✅ Webhook Signature Rejection Verified (401 Unauthorized)');
      } else {
        throw err;
      }
    }

    // 4. Test Valid Webhook Processing & Idempotency
    console.log('Step 3: Testing Valid Webhook Processing...');
    const validWebhookRes = await PaymentService.processWebhook(
      { 'x-wh-secret': 'super_secret_key_123' },
      JSON.stringify({ transId: initRes.providerReference, status: 'SUCCESSFUL' }),
      { transId: initRes.providerReference, status: 'SUCCESSFUL' }
    );

    if (validWebhookRes.status !== 'successful') {
      throw new Error(`Expected payment status 'successful', got '${validWebhookRes.status}'`);
    }

    // Verify Order status updated to 'paid' in DB
    const checkOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [testOrderId]);
    if (checkOrder.rows[0].status !== 'paid') {
      throw new Error(`Expected order status 'paid', got '${checkOrder.rows[0].status}'`);
    }
    console.log('✅ Webhook Processing Verified (Payment -> successful, Order -> paid)');

    // 5. Test Webhook Idempotency (Repeat call should return 200 without duplicate processing)
    console.log('Step 4: Testing Webhook Idempotency...');
    const repeatWebhookRes = await PaymentService.processWebhook(
      { 'x-wh-secret': 'super_secret_key_123' },
      JSON.stringify({ transId: initRes.providerReference, status: 'SUCCESSFUL' }),
      { transId: initRes.providerReference, status: 'SUCCESSFUL' }
    );
    if (!repeatWebhookRes.message.includes('idempotent')) {
      throw new Error('Idempotent webhook repeat call failed!');
    }
    console.log('✅ Webhook Idempotency Verified');

    // 6. Test Status Query
    console.log('Step 5: Testing Payment Status Query...');
    const statusRes = await PaymentService.getPaymentStatus(testOrderId, testUserId);
    if (statusRes.orderStatus !== 'paid' || statusRes.paymentStatus !== 'successful') {
      throw new Error('Payment status check returned incorrect state');
    }
    console.log('✅ Payment Status Query Verified');

    // 7. Test Admin Refund
    console.log('Step 6: Testing Admin Refund...');
    const refundRes = await PaymentService.refundPayment(testPaymentId, 1, 'Customer requested refund');
    if (refundRes.status !== 'refunded') {
      throw new Error(`Expected status 'refunded', got '${refundRes.status}'`);
    }
    const checkRefundOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [testOrderId]);
    if (checkRefundOrder.rows[0].status !== 'refunded') {
      throw new Error('Order status was not updated to refunded!');
    }
    console.log('✅ Admin Refund Logic Verified');

    console.log('\n🎉 ALL PHASE 2 PAYMENT TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('❌ Payment test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup test records
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.end();
  }
}

runPaymentTests();
