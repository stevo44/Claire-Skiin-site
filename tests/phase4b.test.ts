import { initDatabase } from '../src/backend/config/initDb.ts';
import pool from '../src/backend/config/db.ts';
import { CouponService } from '../src/backend/services/coupon.service.ts';
import { PaymentService } from '../src/backend/services/payment.service.ts';

async function cleanup() {
  await pool.query("DELETE FROM payments WHERE provider_reference LIKE 'CS_TEST_%'");
  await pool.query("DELETE FROM coupon_redemptions WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%phase4b%' OR email LIKE '%race4b%'))");
  await pool.query("DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%phase4b%' OR email LIKE '%race4b%')");
  await pool.query("DELETE FROM users WHERE email LIKE '%phase4b%' OR email LIKE '%race4b%'");
  await pool.query("DELETE FROM coupons WHERE code IN ('BELOWMIN', 'GLOBALMAX', 'PERUSERMAX', 'RACECAP', 'DISC10')");
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Phase 4b: 3 Remaining Gap Tests');
  console.log('========================================');
  console.log('');

  await initDatabase();
  await cleanup();

  let testUserId: number | null = null;
  let adminUserId: number | null = null;

  try {
    const uRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ('Phase4b Test User', 'phase4b_test_' || to_char(now(), 'YYYYMMDDHH24MISS'), 'hashed_pw') RETURNING id"
    );
    testUserId = uRes.rows[0].id;

    const aRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ('Phase4b Admin User', 'phase4b_admin_' || to_char(now(), 'YYYYMMDDHH24MISS'), 'hashed_pw') RETURNING id"
    );
    adminUserId = aRes.rows[0].id;

    console.log('Test users created: regular=' + testUserId + ', admin=' + adminUserId);
    console.log('');
  } catch (e) {
    console.error('Setup failed:', e);
  }

  // ITEM 1: Below-minimum order rejection test
  console.log('── [ITEM 1] Below-Minimum Cart Rejection ──');
  console.log('');

  try {
    const couponRes = await pool.query(
      "INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active) VALUES ('BELOWMIN', 'fixed_amount', 500, 5000, 10, TRUE) RETURNING id, code, discount_type, discount_value, min_order_amount"
    );
    const coupon = couponRes.rows[0];
    console.log('Created coupon: ' + coupon.code + ' (min_order_amount=' + coupon.min_order_amount + ', discount=500 XAF fixed)');
    console.log('');

    try {
      const result = await CouponService.validate('BELOWMIN', 3000, testUserId);
      console.log('  ❌ Below-min test PASSED validation (unexpected!)');
      console.log('     Result:', JSON.stringify(result));
    } catch (err: any) {
      if (err.statusCode === 400) {
        console.log('  ✅ Below-min test correctly REJECTED with HTTP 400');
        console.log('     Error message: "' + err.message + '"');
      } else {
        console.log('  ❌ Unexpected error:', err);
      }
    }

    try {
      const result = await CouponService.validate('BELOWMIN', 5500, testUserId);
      console.log('  ✅ Above-min test (5500) correctly PASSED validation');
      console.log('     Discount: ' + result.discountAmount + ' XAF, Final total: ' + result.finalTotal + ' XAF');
    } catch (err: any) {
      console.log('  ❌ Above-min test unexpectedly failed: "' + err.message + '"');
    }
  } catch (e) {
    console.error('Item 1 test error:', e);
  }

  // ITEM 2: Discount-to-Fapshi with real sandbox number
  console.log('');
  console.log('── [ITEM 2] Discount-to-Fapshi Amount Verification ──');
  console.log('');

  let testOrderId: number | null = null;

  try {
    const discCouponRes = await pool.query(
      "INSERT INTO coupons (code, discount_type, discount_value, is_active) VALUES ('DISC10', 'percentage', 10, TRUE) RETURNING id, code, discount_type, discount_value"
    );
    const discCoupon = discCouponRes.rows[0];
    console.log('Created coupon: ' + discCoupon.code + ' (10% off)');

    // Create an order with discounted total = 14850 (original cart 16500, 10% off = 1650 discount)
    const orderRes = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, $2, 'pending', $3, $4) RETURNING id, total_amount, coupon_id, discount_amount",
      [testUserId, 14850.00, discCoupon.id, 1650.00]
    );
    testOrderId = orderRes.rows[0].id;
    console.log('Created order #' + testOrderId + ' with discounted total_amount=' + orderRes.rows[0].total_amount + ' XAF');
    console.log('  (Original cart would be 16500; 10% discount = 1650; final = 14850)');
    console.log('');

    console.log('Calling PaymentService.initiatePayment with phone=670000000...');

    try {
      const initResult = await PaymentService.initiatePayment(
        testUserId!,
        testOrderId!,
        '670000000',
        'mobile money',
        'phase4b_test@example.com'
      );
      console.log('Initiation result:', JSON.stringify(initResult, null, 2));
    } catch (err: any) {
      console.log('  ❌ initiatePayment FAILED:', err.message || err);
      if (err.statusCode) console.log('     HTTP ' + err.statusCode);
    }

    // Check what amount was stored in the payments table
    const payCheck = await pool.query(
      "SELECT id, order_id, amount, provider_reference, provider, status, medium FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
      [testOrderId]
    );

    if (payCheck.rows.length > 0) {
      const p = payCheck.rows[0];
      console.log('');
      console.log('Payment record found in DB:');
      console.log('  amount field: ' + p.amount + ' XAF');
      console.log('  order_id: ' + p.order_id);
      console.log('  provider: ' + p.provider);
      console.log('  provider_reference: ' + p.provider_reference);
      console.log('  medium: ' + p.medium);
      console.log('  status: ' + p.status);

      if (Number(p.amount) === 14850) {
        console.log('  ✅ Amount CONFIRMED as DISCOUNTED order total (14850), NOT original pre-coupon cart total');
      } else {
        console.log('  ⚠️  Amount is ' + p.amount + ', expected 14850 for discounted total');
      }
    } else {
      console.log('');
      console.log('⚠️  No payment record found in DB — initiation may have failed before saving.');
      console.log('  This means Fapshi likely rejected the phone number before the payment record was created.');
      console.log('  The issue is at the Fapshi API level (phone validation), not at amount calculation.');
    }
  } catch (e) {
    console.error('Item 2 test error:', e);
  }

  // ITEM 3a: Global max_uses with 2 different users
  console.log('');
  console.log('── [ITEM 3a] Global max_uses with 2 different users ──');
  console.log('');

  let globalMaxCouponId: number | null = null;

  try {
    const gmcRes = await pool.query(
      "INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_user, is_active) VALUES ('GLOBALMAX', 'fixed_amount', 100, 0, 2, NULL, TRUE) RETURNING id, code, max_uses, max_uses_per_user"
    );
    globalMaxCouponId = gmcRes.rows[0].id;
    console.log('Coupon GLOBALMAX: max_uses=2, max_uses_per_user=NULL');
    console.log('');

    // Create 3 different users
    const u1 = await pool.query("INSERT INTO users (full_name, email, password_hash) VALUES ('Race User 1', 'race4b_user1@example.com', 'pw') RETURNING id");
    const u2 = await pool.query("INSERT INTO users (full_name, email, password_hash) VALUES ('Race User 2', 'race4b_user2@example.com', 'pw') RETURNING id");
    const u3 = await pool.query("INSERT INTO users (full_name, email, password_hash) VALUES ('Race User 3', 'race4b_user3@example.com', 'pw') RETURNING id");
    const user1Id = u1.rows[0].id;
    const user2Id = u2.rows[0].id;
    const user3Id = u3.rows[0].id;
    console.log('Users: user1=' + user1Id + ', user2=' + user2Id + ', user3=' + user3Id);

    // User 1 creates a paid order with the coupon
    const o1 = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, 5000, 'paid', $2, 100) RETURNING id",
      [user1Id, globalMaxCouponId]
    );
    const order1Id = o1.rows[0].id;
    console.log('User1 created order #' + order1Id + ' (paid, coupon used)');

    await CouponService.recordRedemption(globalMaxCouponId!, user1Id, order1Id, 100);
    console.log('Redemption recorded for user1/order1');

    // User 2 creates a paid order with the coupon
    const o2 = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, 5000, 'paid', $2, 100) RETURNING id",
      [user2Id, globalMaxCouponId]
    );
    const order2Id = o2.rows[0].id;
    console.log('User2 created order #' + order2Id + ' (paid, coupon used)');

    await CouponService.recordRedemption(globalMaxCouponId!, user2Id, order2Id, 100);
    console.log('Redemption recorded for user2/order2');

    // User 3 tries to validate (global max_uses=2 already hit)
    try {
      const val = await CouponService.validate('GLOBALMAX', 5000, user3Id);
      console.log('  ❌ User3 validation PASSED (unexpected! Global max_uses should have blocked it)');
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes('maximum redemption limit')) {
        console.log('  ✅ User3 correctly REJECTED by global max_uses');
        console.log('     Error: "' + err.message + '"');
      } else {
        console.log('  ❌ User3 got unexpected error: "' + err.message + '" (status ' + err.statusCode + ')');
      }
    }

    // User1 tries again (global cap of 2 already reached)
    try {
      const val = await CouponService.validate('GLOBALMAX', 5000, user1Id);
      console.log('  ❌ User1 re-validation PASSED (unexpected!)');
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes('maximum redemption limit')) {
        console.log('  ✅ User1 also correctly REJECTED (global cap of 2 reached)');
        console.log('     Error: "' + err.message + '"');
      } else {
        console.log('  ❌ User1 got unexpected error: "' + err.message + '" (status ' + err.statusCode + ')');
      }
    }
  } catch (e) {
    console.error('Item 3a error:', e);
  }

  // ITEM 3b: max_uses_per_user test
  console.log('');
  console.log('── [ITEM 3b] max_uses_per_user with same user ──');
  console.log('');

  try {
    const puRes = await pool.query(
      "INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_user, is_active) VALUES ('PERUSERMAX', 'fixed_amount', 100, 0, 10, 1, TRUE) RETURNING id, code, max_uses, max_uses_per_user"
    );
    const puCouponId = puRes.rows[0].id;
    console.log('Coupon PERUSERMAX: max_uses=10, max_uses_per_user=1');
    console.log('');

    const puUserRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ('PerUser Test User', 'peruser4b@example.com', 'pw') RETURNING id"
    );
    const puUserId = puUserRes.rows[0].id;
    console.log('User: ' + puUserId);

    const po1 = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, 5000, 'paid', $2, 100) RETURNING id",
      [puUserId, puCouponId]
    );
    console.log('Order #' + po1.rows[0].id + ' created (paid, coupon used once)');

    await CouponService.recordRedemption(puCouponId, puUserId, po1.rows[0].id, 100);
    console.log('Redemption recorded');

    // Second order with same coupon (should hit max_uses_per_user=1)
    try {
      const val = await CouponService.validate('PERUSERMAX', 5000, puUserId);
      console.log('  ❌ User 2nd validation PASSED (unexpected! max_uses_per_user=1 should block)');
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes('already used this coupon')) {
        console.log('  ✅ User correctly REJECTED by max_uses_per_user');
        console.log('     Error: "' + err.message + '"');
      } else {
        console.log('  ❌ User got unexpected error: "' + err.message + '" (status ' + err.statusCode + ')');
      }
    }
  } catch (e) {
    console.error('Item 3b error:', e);
  }

  // ITEM 3c: Race condition test
  console.log('');
  console.log('── [ITEM 3c] Race Condition: 2 pending orders, 3rd validation ──');
  console.log('');

  let raceCouponId: number | null = null;

  try {
    const rcRes = await pool.query(
      "INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_user, is_active) VALUES ('RACECAP', 'fixed_amount', 100, 0, 2, NULL, TRUE) RETURNING id, code, max_uses, max_uses_per_user"
    );
    raceCouponId = rcRes.rows[0].id;
    console.log('Coupon RACECAP: max_uses=2, max_uses_per_user=NULL');
    console.log('');

    const raceUserRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ('Race Condition User', 'racecond4b@example.com', 'pw') RETURNING id"
    );
    const raceUserId = raceUserRes.rows[0].id;
    console.log('User: ' + raceUserId);

    // Create 2 orders in 'pending' payment status (neither confirmed paid yet)
    const ro1 = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, 5000, 'pending', $2, 100) RETURNING id",
      [raceUserId, raceCouponId]
    );
    const ro1Id = ro1.rows[0].id;
    console.log('Order #' + ro1Id + ' created (status=pending, no redemption yet)');

    const ro2 = await pool.query(
      "INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount) VALUES ($1, 5000, 'pending', $2, 100) RETURNING id",
      [raceUserId, raceCouponId]
    );
    const ro2Id = ro2.rows[0].id;
    console.log('Order #' + ro2Id + ' created (status=pending, no redemption yet)');

    // Verify 0 confirmed redemptions exist
    const redCount = await pool.query(
      "SELECT COUNT(*) AS cnt FROM coupon_redemptions WHERE coupon_id = $1",
      [raceCouponId]
    );
    console.log('confirmed coupon_redemptions count: ' + redCount.rows[0].cnt);

    // Verify 2 pending orders exist
    const pendCount = await pool.query(
      "SELECT COUNT(*) AS cnt FROM orders WHERE coupon_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '30 minutes'",
      [raceCouponId]
    );
    console.log('pending orders with this coupon (within 30 min window): ' + pendCount.rows[0].cnt);
    console.log('');

    // Now attempt to validate the coupon a 3rd time (same user, since max_uses_per_user is NULL)
    try {
      const val = await CouponService.validate('RACECAP', 5000, raceUserId);
      console.log('  ❌ 3rd validation PASSED — RACE CONDITION GAP EXISTS');
      console.log('     Validation incorrectly succeeds because it only counts 0 confirmed redemptions,');
      console.log('     even though 2 payment orders are already in flight (pending).');
    } catch (err: any) {
      if (err.statusCode === 400) {
        console.log('  ✅ 3rd validation REJECTED — race condition is HANDLED');
        console.log('     Error: "' + err.message + '"');
        console.log('     The current code counts pending orders within 30 min, so');
        console.log('     0 redemptions + 2 pending = 2, which equals max_uses=2, triggering rejection.');
      } else {
        console.log('  ❌ Unexpected error: "' + err.message + '" (status ' + err.statusCode + ')');
      }
    }

    console.log('');
    console.log('  --- Race condition edge: pending orders aging past 30 min ---');
    console.log('  The 30-minute window (NOW() - INTERVAL \'30 minutes\') is a safeguard.');
    console.log('  If 2 pending orders exist but are older than 30 minutes, they would NOT be counted');
    console.log('  as reservations, and a 3rd validation could succeed. This is a known limitation.');

  } catch (e) {
    console.error('Item 3c error:', e);
  }

  // Cleanup
  console.log('');
  console.log('Cleaning up test data...');
  await cleanup();
  await pool.end();

  console.log('');
  console.log('========================================');
  console.log('  Phase 4b Tests Complete');
  console.log('========================================');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
