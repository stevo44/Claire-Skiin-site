# Monitoring & Observability

> **Last updated:** 2026-08-19
> **Scope:** backend logging, health-check monitoring, request tracing, and log
> aggregation for the Claire Skiin Express + TypeScript backend on Render.

---

## 1. What currently exists

### 1.1 Logging — Winston to console

- **Library:** [Winston](https://github.com/wigball/winston) (`src/backend/utils/logger.ts`)
- **Format:** Structured JSON via `winston.format.json()` as the primary format,
  with a Console transport that applies `colorize()` + `simple()` for
  human-readable terminal output. Example console line:
  ```
  info: Order created {"orderId":42,"requestId":"a1b2c3d4-...","timestamp":"..."}
  ```
- **Sensitive-field redaction:** A defense-in-depth `redactFormat` (introduced
  in a prior security pass) recursively replaces values for keys in
  `SENSITIVE_KEYS` (`password`, `token`, `secret`, `authorization`,
  `cookie`, `x-wh-secret`, `x-fapshi-signature`, `x-wh-signature`,
  `card`, `cvv`) with `[REDACTED]` before output.
- **Usage pattern:** Controllers and services call `logger.info(msg, meta)`,
  `logger.error(msg, meta)`, etc. Metadata objects are serialized into
  output automatically.

### 1.2 Request correlation IDs (new — Task 5)

- A `requestIdMiddleware` (`src/backend/middleware/requestId.middleware.ts`)
  is mounted early in `server.ts` — after `helmet()`/CORS setup, before
  `morgan`, body parsing, and all route handlers.
- It generates a `crypto.randomUUID()` per request, attaches it to `req.id`,
  and echoes it in the `X-Request-Id` HTTP response header.
- **Verified:** `curl -i http://localhost:3099/api/health` returns
  `X-Request-Id: <valid-uuid>`, unique per request.
- **Opt-in logging convention:** To include the correlation ID in a log line,
  pass it in the metadata object:
  ```ts
  logger.info('Order created', { requestId: req.id, orderId });
  logger.error('Payment failed', { requestId: req.id, orderId, statusCode: 502 });
  ```
  The logger already serializes arbitrary metadata into its output — verified
  by testing `logger.info('msg', { requestId: 'abc-123' })` which produced
  `... {"requestId":"abc-123",...}`.
- **Important caveat:** Existing log call sites have NOT been retrofitted to
  pass `requestId`. Only new and updated call sites should adopt this pattern.
  Retrofitting all existing call sites is a separate future task (see §4).

### 1.3 Health endpoint

- `GET /api/health` (`src/backend/routes/health.routes.ts`, handled by
  `src/backend/controllers/health.controller.ts`) checks live DB connectivity
  via `pg` pool query and returns:
  ```json
  {
    "status": "success",
    "message": "Backend is healthy",
    "timestamp": "2026-08-19T08:15:48.573Z",
    "database": "connected",
    "dbTime": "2026-08-19T08:15:48.460Z"
  }
  ```
  On failure (DB unreachable), returns HTTP 500:
  ```json
  {
    "status": "error",
    "message": "Backend is unhealthy",
    "database": "disconnected",
    "error": "<error message>"
  }
  ```
- This endpoint is already wired into `render.yaml` via
  `healthCheckPath: /api/health`, which gives Render automatic
  restart-on-failure at the platform level.

### 1.4 Render dashboard log viewer

- Render captures all `stdout`/`stderr` from the service and displays it in
  the dashboard's **Logs** page (text search + filters).
- **Retention by workspace plan** (verified from Render docs):
  | Plan            | Log retention |
  | --------------- | ------------- |
  | Hobby           | 7 days        |
  | Pro             | 14 days       |
  | Scale / Enterprise | 30 days    |
- **Rate limit:** 6,000 application log lines/minute per instance; excess is
  silently dropped.
- **HTTP request logs** (method, status code, response time, path) are only
  generated on **Pro workspace or higher**.
- This is a **baseline reactive view** — someone must actively open the
  dashboard. There is **no alerting** when errors spike or the health
  endpoint fails.

---

## 2. What does NOT exist yet

| Capability             | Status | Notes                                                              |
| ---------------------- | ------ | ------------------------------------------------------------------ |
| External log aggregation | **No** | Logs only live in Render's dashboard log viewer                    |
| Log-based alerting     | **No**   | No alerts on error spikes, 5xx rates, or health-check failures     |
| Metrics dashboards     | **No**   | No Prometheus/Grafana, no p99 latency, no request-rate charts      |
| Uptime monitoring      | **No**   | No external service polls `/api/health` on an interval             |
| Error-tracking (Sentry)| **No**   | No crash aggregation, release tracking, or user-impact analytics   |

---

## 3. Render-level observability (platform, no extra cost)

### 3.1 Health-check-driven restart (already configured)

- `render.yaml` sets `healthCheckPath: /api/health`.
- Render polls this path; if it returns non-200, Render **restarts the
  service instance** automatically.
- This is **restart on failure**, not **alert on failure** — the distinction
  matters (see §4, Task 4 in the deployment brief). The service bounces
  silently; nobody is notified unless they notice the downtime themselves.
- **Verified:** the endpoint returns 200 when healthy and 500 when the DB is
  unreachable, so Render's health check responds correctly.

### 3.2 Render's own request tracing

- Render generates its own request ID (`Rndr-Id` header) on Pro+ workspaces
  and includes a `requestID` field in HTTP request log entries.
- This is **independent** of the app's `X-Request-Id` header. For full
  end-to-end tracing, the app's `X-Request-Id` could be logged alongside
  Render's `Rndr-Id`, but this mapping is not currently implemented.

---

## 4. Options to close the gap

Below are options with brief trade-offs. None are configured or signed up for
— this is a vendor/cost decision for the human to make. Each has a free tier
suitable for low-traffic evaluation.

### 4.1 Uptime monitoring (external health-check polling)

Polls `https://<deployed-url>/api/health` on an interval and alerts on
non-200 or timeout. Free-tier friendly.

| Provider            | Free tier                          | Alert channels         | Notes                              |
| ------------------- | ---------------------------------- | ---------------------- | ---------------------------------- |
| **UptimeRobot**     | 50 monitors, 5-min check interval  | Email, Slack, SMS, webhook | Simplest setup; HTTP(s) + keyword checks |
| **Better Uptime**   | 100 monitors, 3-min checks         | Email, Slack, SMS, webhook | More polished UI; incident timelines |
| **Healthchecks.io** | 20 checks, 1-min frequency         | Email, Slack, SMS, webhook | Cron-oriented but works for HTTP endpoints |

### 4.2 Log aggregation & alerting (pipe Render logs externally)

Render supports **Log Streams** (log drains) on paid plans to forward stdout
to an external provider. See [Streaming Render Service Logs](https://render.com/docs/log-streams).

| Provider               | Free tier                          | Trade-offs                                              |
| ---------------------- | ---------------------------------- | ------------------------------------------------------- |
| **Better Stack (Logtail)** | 1 GB/month, 7-day retention     | Great query language (SQL-like); integrates alerts      |
| **Axiom**              | 1 GB/month, 30-day retention      | Fast, good for high-volume; query-based pricing beyond free |
| **Datadog**            | 5 hosts, limited logs             | Industry standard; can be expensive; full APM suite     |
| **New Relic**          | 100 GB/month telemetry            | Generous free tier; built-in APM + infra monitoring     |

### 4.3 Upgrade Render workspace (no code changes)

- **Pro workspace ($7/service + $22/workspace):** doubles log retention to
  14 days and enables **HTTP request logs** (method, path, status, latency).
- **Scale/Enterprise:** 30-day retention.
- This is the lowest-effort improvement but still **reactive** (no alerting).

---

## 5. Recommended starting point (for the human to decide)

1. **Immediate (free):** Add an **UptimeRobot** monitor for
   `https://<deployed-url>/api/health` with a 5-minute interval and Slack
   alert. This converts the platform's restart-on-failure into
   alert-on-failure — closing the most critical gap with zero cost.
2. **Short term:** Upgrade to a **Pro Render workspace** ($22/mo) to get
   14-day log retention + HTTP request logs for basic debugging context.
3. **Medium term (after traffic grows):** Add a **log drain** to Better Stack
   or Axiom for searchable, alertable structured logs. Combine with
   Render's `Rndr-Id` and the app's `X-Request-Id` to enable per-request
   tracing across middleware → controller → service → DB.
4. **Future:** Consider **Sentry** for error tracking with release
   correlation, and **DataDog/New Relic** for full APM (latency, throughput,
   database query performance).

---

## 6. Retrofitting existing log calls (future work, NOT done here)

The correlation-ID pattern is documented in `logger.ts` and is ready to use,
but existing log call sites do not include `requestId`. To retrofit:

1. Identify hot-path log call sites (error handler, payment service, order
   service, auth service) — these are the highest-value for tracing.
2. At each site, add `requestId: req.id` to the metadata object.
3. For middleware-level logging (e.g., `morgan`), consider extending the
   stream writer to include `req.id`, but this requires Morgan to run after
   the requestId middleware (it already does — see `server.ts` mounting
   order).

This is intentionally **out of scope** for this task to avoid touching
dozens of files and risking unintended behavior changes.
