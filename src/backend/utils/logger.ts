import winston from 'winston';

// === Correlation-ID logging convention =================================
// The requestId middleware (src/backend/middleware/requestId.middleware.ts)
// attaches a `req.id` UUID to every request and echoes it via the
// `X-Request-Id` response header. To trace a request across the full
// request lifecycle (middleware -> controller -> service -> DB), include
// the ID in the metadata object passed to any logger call:
//
//   logger.info('Order created', { requestId: req.id, orderId });
//
// The console transport serializes arbitrary metadata into its output,
// so `requestId` flows through to log lines with no extra configuration.
//
// IMPORTANT: This is an opt-in convention. Existing log call sites have
// NOT been retrofitted to include `requestId` — that is a separate, larger
// future task. New and updated call sites should adopt the pattern above.

// Defense-in-depth: redact common secret-shaped fields anywhere they appear
// in logged metadata, so a future call site that forgets to redact manually
// doesn't leak a secret. This is a safety net, not a replacement for
// explicit redaction at call sites that handle known-sensitive data
// (see payment.controller.ts and payment.service.ts webhook logging).
//
// NOTE: request ID fields (requestId, correlationId) are INTENTIONALLY NOT
// listed below — they must survive redaction so correlated log lines remain
// traceable. Do NOT add them to this set.
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'x-wh-secret',
  'x-fapshi-signature',
  'x-wh-signature',
  'card',
  'cvv',
]);

function redactInPlace(obj: any, depth = 0): void {
  if (!obj || typeof obj !== 'object' || depth > 6) return;
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      obj[key] = '[REDACTED]';
      continue;
    }
    const value = obj[key];
    if (value && typeof value === 'object') {
      redactInPlace(value, depth + 1);
    }
  }
}

const redactFormat = winston.format((info) => {
  // Mutate info in place rather than returning a new object — winston
  // attaches internal properties (e.g. Symbol.for('message')) to info
  // that must be preserved, not dropped by a destructure-and-return.
  redactInPlace(info);
  return info;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
