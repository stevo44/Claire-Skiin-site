import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ── Fail fast on startup if secret is missing ────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    '❌ FATAL: JWT_SECRET environment variable is not set.\n' +
    '   Add it to your .env file and restart the server.'
  );
}

// ── Typed request extension ───────────────────────────────────────────────────
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// ── Middleware ────────────────────────────────────────────────────────────────
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token has expired. Please log in again.' });
      return;
    }
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const optionalAuthenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as AuthenticatedUser;
    req.user = decoded;
  } catch (error) {
    // Ignore invalid/expired token for optional auth, proceed as guest
  }
  next();
};

