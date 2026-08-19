import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.ts';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode  = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Something went wrong.';

  // Always log the full error server-side
  logger.error({
    statusCode,
    message,
    method:  req.method,
    url:     req.originalUrl,
    ip:      req.ip,
    stack:   err.stack,
  });

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status:  'error',
      message,
      stack:   err.stack,
    });
    return;
  }

  // Production: never leak stack traces or internal error details
  if (err.isOperational) {
    // Known, safe-to-expose errors (AppError instances)
    res.status(statusCode).json({ status: 'error', message });
  } else {
    // Unknown errors (bugs, DB crashes) — hide details
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};
