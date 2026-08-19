# Claire Skiin — Changes Made

This document covers everything implemented directly on your original codebase (the version first uploaded to this conversation, before any coding-agent session touched it). Every change below was applied, then verified with a real `npx tsc --noEmit` run (zero errors throughout) and, where relevant, a real `npx vite build`.

**What this ZIP does NOT include, deliberately:**
- `.env` — your real credentials. Use your own `.env` (see the rotation note below — this matters).
- `.git/` — the original repo's git history predates most of your real feature work and would be misleading if treated as this codebase's actual history. Re-initialize git fresh (`git init`) once you've reviewed these changes, or diff this folder against your current working repo manually.
- `node_modules/` — run `npm install` after extracting. This will also install the two new dependencies added below (`file-type`).

---

## ⚠️ Two things that are NOT fixed by anything in this ZIP — action required on your end

1. **Rotate your Supabase database password.** It existed in plaintext in a file (`testDbConn.mjs`) that was part of an earlier upload in this conversation. Whether or not that file still exists anywhere now, treat that specific password as compromised.
2. **Rotate your `JWT_SECRET`.** Same situation — it was found hardcoded as a fallback value in a script (`tmp_run_tests.ts`) that also passed through this conversation. Rotating it will log out every currently-authenticated user (expected, one-time).

Neither of these can be done from inside a codebase — they're actions in your Supabase dashboard and your deployment's environment configuration, respectively.

---

## Security fixes

### Credential & secret hygiene
- Confirmed `testDbConn.mjs` (the file that previously contained a hardcoded live DB password) is absent from this baseline.
- `.gitignore` extended to catch ad-hoc debug/test scripts at the repo root (`tmp_*`, `test-*`, `debug-*`, `check-*`, `verify-*`, `create-*`, `enable-*`, `activate-*`, `change-*`, `seed-*`, `promote_*`, `create_notif.ts`) — these are exactly the kind of files that leaked credentials before; this prevents a future one from being committed.

### Payment webhook security (`src/backend/services/payment.service.ts`)
- Added a `safeCompare()` helper using `crypto.timingSafeEqual` (with a length pre-check, since `timingSafeEqual` throws on mismatched lengths). Replaced **both** the webhook shared-secret comparison and the HMAC-SHA512 digest comparison, which previously used plain `===` — a timing side-channel vulnerability.
- Added a fail-closed startup check: if `FAPSHI_WEBHOOK_SECRET` is missing in production, the app now throws at load time instead of silently processing unverified webhooks. Mirrors the existing `JWT_SECRET` fail-fast pattern in `auth.middleware.ts`.
- **Fixed a real race condition** in `applyStateTransition`: the idempotency check previously read `payment.status` from the object the *caller* had already fetched, which could be stale if two callers (the webhook handler and the frontend's payment-status polling) both read the row while it was still `pending`. This was root-caused as the actual cause of a reported "3 notifications instead of 1" bug. Fixed by re-fetching and locking the row inside the transaction (`SELECT ... FOR UPDATE`) before checking terminal state — a concurrent second caller now blocks until the first transaction commits, then correctly sees the post-transition status and skips.

### Logging (`src/backend/controllers/payment.controller.ts`, `src/backend/services/payment.service.ts`, `src/backend/utils/logger.ts`)
- Webhook arrival and rejection logs no longer include raw headers — `x-wh-secret`, `x-fapshi-signature`, `x-wh-signature`, `authorization`, and `cookie` are stripped before logging. The full, unredacted headers are still passed to the actual signature-verification function, which needs them — only the *logging* calls were changed.
- `logger.ts` rewritten with a recursive redaction safety net: any logged object with a key matching `password`, `token`, `secret`, `authorization`, `cookie`, or a few webhook-specific header names gets its value replaced with `[REDACTED]`, at any nesting depth. This is defense-in-depth on top of the explicit fixes above, in case a future log call forgets to redact manually.
- All 30 `console.log`/`console.error`/`console.warn` calls across 9 controller files replaced with the structured `logger` (adding the import where it was missing). Verified zero remaining via `grep`.

### File uploads (`src/backend/middleware/upload.middlewear.ts`, `src/backend/controllers/upload.controllers.ts`)
- Previously, upload validation only checked the client-supplied `Content-Type` header (trivially spoofable) and used the client-supplied filename's extension for the stored file — meaning a file named `shell.php` with a spoofed `image/png` header would land on disk as `product-<...>.php`.
- Rewritten to use `multer.memoryStorage()` instead of writing directly to disk, then verifying actual file content via magic-byte detection (`file-type` package) before ever writing anything. The on-disk filename's extension is now derived from the *detected* content type, never the client-supplied name. Added `file-type` as a real dependency.

### Input validation (`src/backend/middleware/validation.middleware.ts` + route files)
- Added Joi validation schemas for `payments`, `coupons`, `orders`, and `reviews` — previously unvalidated routes. Each schema was written by reading the actual controller's field usage first, not guessed:
  - **Payments**: `medium` is intentionally a loose string, not a strict enum, because the service layer itself doesn't enforce a fixed set of values.
  - **Orders**: intentionally permissive on `shipping_address`/`billing_address` (accepts string or object, since `createOrder` handles both) and doesn't duplicate `delivery_method`'s enum check (the controller already has its own specific error message for that).
  - **Reviews**: `body` is required with `min(10)`, matching the controller's own validation exactly (not the looser version originally drafted).
- Wired into `payment.routes.ts`, `order.routes.ts`, `coupon.routes.ts`, `review.routes.ts`, and the relevant admin routes.

### Auth (`src/backend/routes/event.routes.ts`, `src/backend/controllers/auth.controller.ts`)
- `event.routes.ts` had its own inline JWT verification with a **hardcoded fallback secret** (`'fallback_secret'`), duplicating logic that already existed correctly in `auth.middleware.ts`. Replaced with the shared `optionalAuthenticateToken` — removes the hardcoded secret and the duplicate code.
- Login failure messages no longer disclose the remaining-attempts count before lockout (was: `"Invalid email or password. 3 attempts remaining..."`, now: `"Invalid email or password."`). The actual lockout logic (5 attempts, 15-minute lock) is unchanged — only the message was a problem.

### Content-Security-Policy (`server.ts`)
- Previously: CSP disabled entirely in dev, and left at Helmet's untuned defaults in production. Replaced with an explicit policy, built from actually checking what the app loads (Google Fonts stylesheets, same-origin Socket.io):
  ```
  default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:; connect-src 'self' wss:;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
  ```
  **Trade-off worth knowing**: `style-src` includes `'unsafe-inline'` because Tailwind/React inline `style` attributes are used throughout the app. This weakens CSP's protection against injected `<style>` content specifically — the alternative (per-element nonces) is a larger change than fit in this pass. **This CSP has not been tested in a real browser** — recommend loading the site with DevTools open and checking the console for CSP violation errors before fully trusting it in production.

---

## Bug fixes

### 1. Shipping fee mismatch (`src/services/shippingService.ts`, `src/pages/CheckoutPage.tsx`)
**Root cause**: a hardcoded `DEFAULT_TOWNS` fallback array (e.g., Douala at a stale price) was used as the checkout page's *initial* state, not just a genuine last-resort — meaning it could be shown before the live API response ever arrived. Fixed by starting with an empty state and a loading skeleton, and only using the fallback on a genuine API failure — with a visible warning shown to the customer when that happens (`"Using estimated shipping rates — final cost will be confirmed at checkout"`), rather than silently presenting stale data as current.

### 2. Order confirmation always showing 0 (`src/pages/OrderConfirmedPage.tsx`)
**Root cause**: `CheckoutPage.tsx` navigates with `{ state: { order: createdOrder } }` — nested under an `order` key — but `OrderConfirmedPage.tsx` was reading `location.state` as if it *were* the order object directly, so `order.total` was always `undefined` and fell through to a `?? 0` fallback. Fixed by correctly unwrapping the nested shape, while staying backward-compatible with a flat object if ever passed that way. Separately confirmed the query-param flow (`?orderId=...`, used when returning from a payment redirect) was **never actually broken** — the backend's `getOrderById` returns the order flat with `total_amount` at the top level, and the frontend service doesn't add another wrapping layer.

### 3. Email notifications not sending (`src/backend/utils/email.ts`, `src/backend/services/notification.service.ts`, `src/backend/config/initDb.ts`)
Rather than guess at the cause (missing config vs. failing Gmail auth — these look identical from the outside), added real delivery tracking so failures are no longer invisible:
- `sendEmail()` now returns `{ success, fellBackToConsole }` instead of `void`, without changing its deliberate "never throw" behavior (email failures must never break auth/order flows).
- Added an `email_status` column to the `notifications` table (`'pending' | 'sent' | 'failed'`), via both a fresh-install `CREATE TABLE` addition and an idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for databases that already exist.
- `NotificationService.createNotification` now records the outcome on the notification row.
- The new Notifications page displays this as a badge (`Email Sent` / `Email Pending` / `Email Failed`).
- **You'll still need to check which failure mode you're actually hitting** — look for `📧 [EMAIL SENT (FALLBACK)]` (config not set) vs. `❌ [EMAIL SEND ERROR]` (config set but failing — check the actual error text for Gmail-specific causes like a revoked App Password) in your server logs. This tracking makes that diagnosis possible going forward without grepping logs blind.
- **Not verified against a live database from this environment** — my sandbox can't reach your Supabase host. The `ALTER TABLE` statement is simple, standard Postgres syntax, but worth confirming it runs cleanly on your actual database on first deploy.

### 4. Missing notification history page (`src/pages/NotificationsPage.tsx`, `src/App.tsx`, `src/components/ClaireSkaNavbar.tsx`)
Discovered that a full notification bell dropdown **already existed** in `ClaireSkaNavbar.tsx` (type-based icons, mark-all-as-read, unread badge) — but it was wrapped in `hidden md:block`, meaning it was **desktop-only**. This is very likely the actual reason "no notification history" was reported — mobile users had zero access to notifications at all, not because the feature didn't exist, but because it was invisible on their device.

Built a dedicated `/notifications` page (paginated, read/unread filter, mark individual/all as read, email-status badges) and added two entry points:
- A "View all notifications" link at the bottom of the existing desktop dropdown.
- A new notifications link in the mobile menu (which didn't have any notification access before), with its own unread-count badge.

### Notification race condition
Covered above under Security — this was originally reported as a bug ("3 notifications instead of 1") but the actual fix is a security-relevant concurrency issue (`FOR UPDATE` row locking), so it's documented there.

---

## Performance fixes

### Customer-facing code splitting (`src/App.tsx`)
**Measured before/after via real `npx vite build` runs** — not estimated:

| | Before | After |
|---|---|---|
| Main JS chunk | 824.95 kB | **555.31 kB** |
| Gzipped | 206.67 kB | **163.96 kB** |

Every customer-facing page (`HomePage`, `ShopPage`, `ProductDetailPage`, `CartPage`, `CheckoutPage`, `HairCarePage`, `LipCarePage`, `SpaServicesPage`, `LoginPage`, `RegisterPage`, `OrderConfirmedPage`, `WishlistPage`, and the new `NotificationsPage`) is now `lazy()`-loaded with its own chunk, matching the pattern that was already correctly used for admin pages — previously it was backwards, with your handful of internal admin users getting code-splitting while every mobile customer downloaded the entire storefront (including checkout/payment code) before the homepage even rendered. `NotFoundPage` was deliberately left eager since it's tiny and used as a 404 catch-all — splitting it out would add a network round-trip for no benefit.

**Design decision made explicitly**: the `Suspense` fallback is `null` (no visible spinner), rather than reusing the admin panel's spinner. Reasoning: a lazy-page loading window is typically sub-second and near-instant on repeat navigation once chunks are cached — a flashed loading box for that brief instant is often more jarring than a blank moment, especially since `HomePage` is most visitors' very first impression of the site. This is a judgment call, not a fact — reasonable to revisit if it doesn't feel right in practice.

### The `manualChunks` investigation (`vite.config.ts`)
This needed real investigation, not a guessed config fix — and the actual answer was different from what seemed likely at the start. `vendor-motion` (framer-motion) and `vendor-gsap` (gsap, `@gsap/react`) were coming out of every build as nearly empty (0.04 kB). **Confirmed via a full `grep` sweep: both packages have zero import sites anywhere in `src/`.** This was never a Rollup/Vite bug — the packages are simply unused, so there was nothing for those chunks to contain. Removed those two entries from `manualChunks` (they were misleading — implying active use that doesn't exist) and left a comment explaining why, plus a note that `framer-motion`/`gsap`/`@gsap/react` are worth removing from `package.json` entirely in a future dependency cleanup.

`vendor-ui` (`clsx`, `tailwind-merge`, `lucide-react`) was also empty, for a related but distinct reason: while `lucide-react` genuinely is imported in several files, **none of those files are reachable from the app's actual route tree** — they're orphaned/dead components (confirmed via grep: nothing imports `StatusCard.tsx`, `CartItem.tsx`, `ProductCard.tsx`, or `AdminDashboard.tsx`). Notably, `ProductCard.tsx` looked like it should be core storefront code — checked `ShopPage.tsx` directly and confirmed it renders products with its own inline markup instead, so this isn't a missing/broken feature, just legacy dead code that was never deleted. Left `vendor-ui` in the config since it's harmless and would activate correctly if that dead code is ever cleaned up and lucide-react usage becomes reachable.

**What's still unexplained**: the main chunk is still 555 kB. This is no longer attributable to the phantom animation-library issue — it's now honestly a mix of genuinely-used packages (Supabase client, Axios, Socket.io client, the AI chat SDK) that aren't assigned to any manual chunk. A full breakdown would need bundle-visualizer tooling (e.g. `rollup-plugin-visualizer`), which wasn't run — flagging as further work rather than guessing at which package to blame.

### N+1 order-item inserts (`src/backend/controllers/order.controller.ts`)
Order items were being inserted one row at a time in a loop. Replaced with a single multi-row `INSERT`, parameterized (no string interpolation of values), inside the same transaction.

### Checkout response no longer blocked on admin notifications (`src/backend/controllers/order.controller.ts`)
The customer's order-confirmation response previously waited for the entire admin/staff notification broadcast to complete before being sent. Reordered so the response is sent first; the notification call is now fire-and-forget, with its own errors caught and logged rather than able to affect an already-sent response.

---

## Mobile fixes

### Real bug found and fixed, not just sizing (`src/claire-styles.css`)
`.card-view-btn` (the "View All" / "View Menu" overlay on homepage category cards) was `transform: scale(0)` by default, only becoming visible via `.category-card:hover`. **`:hover` never fires on touch devices** — meaning this affordance was permanently invisible on mobile. The card itself was still tappable (the `onClick` handler is on the parent `<div>`, not the button), so this wasn't a functional dead-end, but mobile users got zero visual cue that the cards were interactive. Fixed with a `@media (max-width: 768px)` rule showing the button by default on mobile, matching the desktop hover-revealed state.

### Tap targets (`src/components/ClaireSkaNavbar.tsx`, `src/components/admin/Header.tsx`)
- Mobile menu toggle bumped from 42px to the 44px minimum (iOS HIG / Material Design standard).
- The cart icon button (the only one of the navbar's icon buttons actually visible on mobile — the others are `hidden md:flex`) bumped to 44px.
- Mobile menu drawer given `overflow-y-auto` — previously had no scroll behavior, meaning menu items could be cut off / inaccessible on short viewports.
- Admin header's notification bell (`Header.tsx`) given a proper 44×44px tap target — previously had no explicit sizing at all.

### Mobile notification access (covered above under bug fixes)
Added a notifications link to the mobile menu, since the existing dropdown was desktop-only.

---

## Not done in this pass — honest list, not hidden

- **Rotating the DB password and JWT secret** — cannot be done from a codebase; both remain your action.
- **CSP browser verification** — the policy is applied but untested in an actual browser; check DevTools console for violations before fully trusting it.
- **Email failure-mode diagnosis** — the tracking infrastructure is now in place, but you'll need to check your own server logs (or the new status badges after some real traffic) to see which failure mode you're actually hitting.
- **`email_status` column migration** — not verified against a live database from this environment (no network access to your Supabase host from here).
- **Bundle-visualizer breakdown of the remaining 555 kB main chunk** — flagged as real further work, not guessed at.
- **Removing the now-confirmed-dead code** — `ProductCard.tsx`, `StatusCard.tsx`, `CartItem.tsx`, `AdminDashboard.tsx` are unreferenced by anything in the route tree. `framer-motion`, `gsap`, `@gsap/react`, `clsx`, and `tailwind-merge` all have zero import sites anywhere in `src/` (confirmed via grep) and are candidates for removal from `package.json`. Found, not removed — deleting things wasn't in scope for this pass and deserves its own careful verification first.
- **Testing infrastructure** (Vitest + Supertest + isolated test DB) — was scoped and planned earlier in this project's history but not implemented in this specific pass. Real automated test coverage is still effectively 0%, which matters a lot given how many of the fixes above (especially the race-condition fix) would benefit from a concurrency test proving they work, not just compiling cleanly.
- Every item from the earlier, broader audit categories that was never started at all: accessibility, SEO, database integrity beyond what surfaced incidentally, deployment config (Dockerfile/CI), backup/disaster recovery, monitoring.

---

## How to verify this yourself

```bash
npm install
npx tsc --noEmit        # should show zero errors
npx vite build           # should succeed; compare chunk sizes to the table above
```

Then start the app against your real `.env` and manually walk through: login with wrong password 5 times (should lock), complete a checkout end-to-end (should show the real total on confirmation, not 0), check the shipping rate shown matches what actually gets charged, upload a renamed non-image file through the admin panel (should be rejected), and check `/notifications` on both desktop and a mobile viewport.
