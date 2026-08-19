

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { authRouter }    from './routes/auth.routes.ts';
import { productRouter } from './routes/product.routes.ts';
import { cartRouter }    from './routes/cart.routes.ts';
import { orderRouter }   from './routes/order.routes.ts';
import { shippingRouter } from './routes/shipping.routes.ts';
import { paymentRouter } from './routes/payment.routes.ts';
import { adminRouter }   from './routes/admin.routes.ts';
import { aiRouter }      from './routes/ai.routes.ts';
import { healthRouter }  from './routes/health.routes.ts';
import { eventRouter }   from './routes/event.routes.ts';
import { errorHandler }  from './middleware/error.middleware.ts';
import { xssSanitize }   from './middleware/xss.middleware.ts';
import { initSocket }    from './utils/socket.ts';
import { initDatabase }  from './config/initDb.ts';
import logger            from './utils/logger.ts';

dotenv.config();

// ── Environment guards ────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.CORS_ORIGIN) {
  throw new Error(
    '❌ FATAL: CORS_ORIGIN must be set in production.\n' +
    '   Example: CORS_ORIGIN=https://yourapp.com'
  );
}

// ── CORS config ───────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman in dev)
    if (!origin && !isProduction) return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Rate limiters ─────────────────────────────────────────────────────────────
/** Tight limit on auth endpoints — prevents brute-force & credential stuffing */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  skip: () => !isProduction, // disabled in development
});

/** Loose limit on general API — prevents DoS */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
  skip: () => !isProduction,
});

// ── App setup ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const http = createServer(app);

initSocket(http, allowedOrigins);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow product images from external URLs
  contentSecurityPolicy: isProduction ? undefined : false,
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// ── Body parsing (tightened limits) ──────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(xssSanitize);

// ── Static uploads ────────────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/health',    healthRouter);
app.use('/api/auth',      authLimiter, authRouter);
app.use('/api/products',  apiLimiter,  productRouter);
app.use('/api/cart',      apiLimiter,  cartRouter);
app.use('/api/orders',    apiLimiter,  orderRouter);
app.use('/api/shipping',  apiLimiter,  shippingRouter);
app.use('/api/payments',  apiLimiter,  paymentRouter);
app.use('/api/admin',     apiLimiter,  adminRouter);
app.use('/api/ai',        apiLimiter,  aiRouter);
app.use('/api/events',    apiLimiter,  eventRouter);

// ── SPA fallback (production only) ────────────────────────────────────────────
if (isProduction) {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath, { maxAge: '1d', etag: true }));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

const start = async () => {
  try {
    await initDatabase();
    const server = http.listen(PORT, () => {
      logger.info(`🚀 Claire Skiin server on port ${PORT}`);
      logger.info(`   Mode : ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   CORS : ${allowedOrigins.join(', ')}`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after 10s if connections don't drain
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
export default app;
