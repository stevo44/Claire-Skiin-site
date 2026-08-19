import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createServer } from "http";

import pool from "./src/backend/config/db.ts";
import { initDatabase } from "./src/backend/config/initDb.ts";
import { authRouter } from "./src/backend/routes/auth.routes.ts";
import { productRouter } from "./src/backend/routes/product.routes.ts";
import { cartRouter } from "./src/backend/routes/cart.routes.ts";
import { orderRouter } from "./src/backend/routes/order.routes.ts";
import { eventRouter } from "./src/backend/routes/event.routes.ts";
import { adminRouter } from "./src/backend/routes/admin.routes.ts";
import { aiRouter } from "./src/backend/routes/ai.routes.ts";
import { paymentRouter } from "./src/backend/routes/payment.routes.ts";
import { appointmentRouter } from "./src/backend/routes/appointment.routes.ts";
import { wishlistRouter } from "./src/backend/routes/wishlist.routes.ts";
import { couponRouter } from "./src/backend/routes/coupon.routes.ts";
import { reviewRouter, reviewStandaloneRouter } from "./src/backend/routes/review.routes.ts";
import { healthRouter } from "./src/backend/routes/health.routes.ts";
import { notificationRouter } from "./src/backend/routes/notification.routes.ts";
import { errorHandler } from "./src/backend/middleware/error.middleware.ts";
import { xssSanitize } from "./src/backend/middleware/xss.middleware.ts";
import { requestIdMiddleware } from "./src/backend/middleware/requestId.middleware.ts";
import logger from "./src/backend/utils/logger.ts";
import { initSocket } from "./src/backend/utils/socket.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [
        process.env.APP_URL,
        process.env.SHARED_APP_URL,
        'http://localhost:3000',
        'http://localhost:5173',
      ].filter(Boolean) as string[];

  // Initialize Socket.io
  initSocket(httpServer, allowedOrigins);
  
  // 1. PROXY & SECURITY & LOGGING
  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            // 'unsafe-inline' is required because Tailwind/React inline
            // style attributes are used throughout the app. This is a
            // deliberate trade-off, not an oversight — the alternative
            // (per-element nonces) is a larger change out of scope here.
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:','https://lh3.googleusercontent.com','https://images.unsplash.com'],
           connectSrc: ["'self'", 'wss:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
  }));

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin && !isProduction) return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Correlation ID — attach a unique UUID to every request, emitted as the
  // X-Request-Id response header and available on req.id for log tracing.
  app.use(requestIdMiddleware);

  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  
  // 2. RATE LIMITING (skipped in dev mode to prevent testing blocks)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts. Please try again in 15 minutes.' },
    skip: () => !isProduction,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' },
    skip: () => !isProduction,
  });

  // Initialize database schema
  try {
    await initDatabase();
  } catch (error) {
    logger.error("Failed to initialize database:", error);
  }

  const PORT = Number(process.env.PORT) || 3000;

  // Body parsing (captures rawBody for webhook HMAC signature verification)
  app.use(express.json({
    limit: '2mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(xssSanitize);

  // Static uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

  // API Routes
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/products/:productId/reviews", apiLimiter, reviewRouter);
  app.use("/api/reviews", apiLimiter, reviewStandaloneRouter);
  app.use("/api/products", apiLimiter, productRouter);
  app.use("/api/cart", apiLimiter, cartRouter);
  app.use("/api/orders", apiLimiter, orderRouter);
  app.use("/api/events", apiLimiter, eventRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/admin", apiLimiter, adminRouter);
  app.use("/api/ai", apiLimiter, aiRouter);
  app.use("/api/wishlist", apiLimiter, wishlistRouter);
  app.use("/api/coupons", apiLimiter, couponRouter);
  app.use("/api", apiLimiter, appointmentRouter);
  app.use("/api/notifications", apiLimiter, notificationRouter);

  // 3. GLOBAL ERROR HANDLER
  app.use(errorHandler);

  // Vite middleware for development / static serve for production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: '1d', etag: true }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Claire Skiin server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error("Failed to start server:", err);
});
