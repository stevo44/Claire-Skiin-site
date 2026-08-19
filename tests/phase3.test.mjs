/**
 * Phase 3 Comprehensive Live Integration Test Suite
 * Runs against http://localhost:3000
 */
import http from 'http';
import jwt from 'jsonwebtoken';

const BASE = 'http://localhost:3000';
const JWT_SECRET = "c3NAkOaxYpoRPeDwguLotSer/J8ihcI/QYdHwfmus8D9lAUTGO+TTAsuuCRaARgnjCfU/8jMgOZGDeECJslSjA==";

// Generate token for user id = 1 (assigned admin role in DB)
function generateToken(id = 1, email = 'admin@claireskiin.com', role = 'admin') {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '1h' });
}

const adminToken = generateToken(1, 'admin@claireskiin.com', 'admin');
// Non-admin token for user id = 9999 (no permissions)
const unprivilegedToken = generateToken(9999, 'unpriv@example.com', 'customer');

// Helper HTTP function
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const payload = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...headers,
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

let pass = 0, fail = 0;
function check(label, condition, actual) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    pass++;
  } else {
    console.log(`  ❌  ${label}`);
    console.log(`       actual:`, JSON.stringify(actual, null, 2).slice(0, 500));
    fail++;
  }
}

// Generate unique date string per run: e.g. 2026-09-XX
const runId = Math.floor(Math.random() * 800) + 100;
const testDate1 = `2026-09-${(runId % 28 + 1).toString().padStart(2, '0')}`;
const testDate2 = `2026-09-${((runId + 1) % 28 + 1).toString().padStart(2, '0')}`;

console.log('\n══════════════════════════════════════════════');
console.log(` Phase 3 Comprehensive Verification Suite (Run: ${runId})`);
console.log(` Test Dates: ${testDate1}, ${testDate2}`);
console.log('══════════════════════════════════════════════\n');

// ── 1. Public Service & Slot listing ──────────────────────────────────────
console.log('── [1] Public Endpoint Checks ────────────────');
const servicesRes = await req('GET', '/api/spa-services');
check('GET /api/spa-services → 200 OK', servicesRes.status === 200, servicesRes);
check('Seeded services returned', servicesRes.body?.data?.length > 0, servicesRes.body);

const slotsRes = await req('GET', '/api/spa-slots');
check('GET /api/spa-slots → 200 OK', slotsRes.status === 200, slotsRes);
check('12 slots returned', slotsRes.body?.data?.length === 12, slotsRes.body);

const s1 = servicesRes.body?.data?.[0];
const s2 = servicesRes.body?.data?.[1];

// ── [TEST 1] Book appointment as customer (Persisted to DB) ─────────────
console.log('\n── [TEST 1] Customer Booking & DB Persistence ──');
const testTime1 = '09:00';

const book1 = await req('POST', '/api/appointments', {
  customerName: 'Claire Customer',
  customerEmail: 'claire@example.com',
  customerPhone: '+237670000099',
  serviceIds: [s1.id],
  date: testDate1,
  time: testTime1,
  timeSlotLabel: '9:00 AM',
  notes: 'Phase 3 Verification Test 1',
});

check('POST /api/appointments → 201 Created', book1.status === 201, book1);
check('Generated appointmentNumber starting with SPA-', book1.body?.data?.appointmentNumber?.startsWith('SPA-'), book1.body);
check('Status is pending', book1.body?.data?.status === 'pending', book1.body);
const appt1Id = book1.body?.data?.id;

// Confirm persistence via Admin GET endpoint
const adminFetch1 = await req('GET', `/api/admin/appointments?date=${testDate1}`, null, {
  Authorization: `Bearer ${adminToken}`,
});
check('GET /api/admin/appointments returns newly persisted booking', adminFetch1.body?.data?.some(b => b.id === appt1Id), adminFetch1.body);

// ── [TEST 2] Double-booking Rejection (409) ──────────────────────────────
console.log('\n── [TEST 2] Double-Booking Rejection (409 Conflict) ──');
const book2 = await req('POST', '/api/appointments', {
  customerName: 'Attacker Customer',
  customerEmail: 'attacker@example.com',
  customerPhone: '+237670000088',
  serviceIds: [s1.id],
  date: testDate1,
  time: testTime1, // Exact same date and time slot
  timeSlotLabel: '9:00 AM',
});

check('Duplicate booking attempt → 409 Conflict', book2.status === 409, book2);
check('Correct conflict error message returned', book2.body?.message?.includes('no longer available'), book2.body);

// ── [TEST 3] Cancellation & Rebooking Freed Slot ─────────────────────────
console.log('\n── [TEST 3] Cancellation & Rebooking Freed Slot ──');
// Cancel appt1
const cancelRes = await req('PUT', `/api/admin/appointments/${appt1Id}/status`, {
  status: 'cancelled',
}, { Authorization: `Bearer ${adminToken}` });

check('Cancel appointment via Admin status update → 200 OK', cancelRes.status === 200, cancelRes);
check('Status updated to cancelled', cancelRes.body?.data?.status === 'cancelled', cancelRes.body);

// Rebook the freed slot (testDate1, testTime1)
const bookFreed = await req('POST', '/api/appointments', {
  customerName: 'Replacement Customer',
  customerEmail: 'replacement@example.com',
  customerPhone: '+237670000077',
  serviceIds: [s1.id],
  date: testDate1,
  time: testTime1,
  timeSlotLabel: '9:00 AM',
  notes: 'Rebooked freed slot successfully',
});

check('Rebook cancelled slot → 201 Created (Constraint excludes cancelled)', bookFreed.status === 201, bookFreed);
const apptFreedId = bookFreed.body?.data?.id;

// ── [TEST 4] Reschedule Verification ─────────────────────────────────────
console.log('\n── [TEST 4] Reschedule Verification (Old freed, New checked) ──');
const testTime2 = '10:00';

// First book testTime2 so it is occupied
const apptOccupied = await req('POST', '/api/appointments', {
  customerName: 'Occupant Customer',
  customerEmail: 'occupant@example.com',
  customerPhone: '+237670000066',
  serviceIds: [s1.id],
  date: testDate2,
  time: testTime2,
  timeSlotLabel: '10:00 AM',
});
check('Book target slot for reschedule conflict test → 201 Created', apptOccupied.status === 201, apptOccupied);

// Attempt to reschedule apptFreedId to testTime2 (which is occupied) -> expect 409
const reschedConflict = await req('PUT', `/api/appointments/${apptFreedId}/reschedule`, {
  date: testDate2,
  time: testTime2,
  timeSlotLabel: '10:00 AM',
}, { Authorization: `Bearer ${adminToken}` });

check('Reschedule to occupied slot → 409 Conflict', reschedConflict.status === 409, reschedConflict);

// Reschedule apptFreedId to a FREE slot (14:00) -> expect 200 OK
const reschedSuccess = await req('PUT', `/api/appointments/${apptFreedId}/reschedule`, {
  date: testDate2,
  time: '14:00',
  timeSlotLabel: '2:00 PM',
}, { Authorization: `Bearer ${adminToken}` });

check('Reschedule to free slot → 200 OK', reschedSuccess.status === 200, reschedSuccess);
check('Updated date is ' + testDate2, reschedSuccess.body?.data?.date === testDate2, reschedSuccess.body);
check('Updated time is 14:00', reschedSuccess.body?.data?.time === '14:00', reschedSuccess.body);

// Verify OLD slot (testDate1, 09:00) is now free by booking it again!
const rebookOldSlot = await req('POST', '/api/appointments', {
  customerName: 'Old Slot Customer',
  customerEmail: 'oldslot@example.com',
  customerPhone: '+237670000055',
  serviceIds: [s1.id],
  date: testDate1,
  time: testTime1,
  timeSlotLabel: '9:00 AM',
});
check('Book OLD slot after reschedule → 201 Created (OLD slot freed)', rebookOldSlot.status === 201, rebookOldSlot);

// ── [TEST 5] Multi-Service Booking Price & Duration Calculation ─────────
console.log('\n── [TEST 5] Multi-Service Booking Price & Duration ──');
const expectedSumPrice = Number(s1.price) + Number(s2.price);

const multiBook = await req('POST', '/api/appointments', {
  customerName: 'Multi Service VIP',
  customerEmail: 'vip@example.com',
  customerPhone: '+237670000044',
  serviceIds: [s1.id, s2.id],
  date: testDate2,
  time: '11:00',
  timeSlotLabel: '11:00 AM',
});

check('Multi-service booking → 201 Created', multiBook.status === 201, multiBook);
const actualTotalPrice = Number(multiBook.body?.data?.totalPrice);
check(`Calculated totalPrice (${actualTotalPrice}) matches sum of services (${expectedSumPrice})`, actualTotalPrice === expectedSumPrice, actualTotalPrice);
check('Junction procedures array has 2 items', multiBook.body?.data?.procedures?.length === 2, multiBook.body?.data?.procedures);

// ── [TEST 6] Staff Role RBAC Permissions ───────────────────────────────
console.log('\n── [TEST 6] Staff Role Permission Gating ──');
// Unauthorized call without token
const noAuth = await req('GET', '/api/admin/appointments');
check('Unauthenticated access to /admin/appointments → 401 Unauthorized', noAuth.status === 401, noAuth);

// Non-privileged user token calling gated admin resource (e.g., analytics or users)
const unprivGatedCall = await req('GET', '/api/admin/users', null, {
  Authorization: `Bearer ${unprivilegedToken}`,
});
check('Unprivileged user calling /admin/users → 403 Forbidden', unprivGatedCall.status === 403, unprivGatedCall);

// ── Summary ───────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(` Final Test Results: ${pass} passed, ${fail} failed`);
console.log('══════════════════════════════════════════════\n');

process.exit(fail > 0 ? 1 : 0);
