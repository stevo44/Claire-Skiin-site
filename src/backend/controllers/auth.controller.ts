import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import { sendSuccess } from '../utils/response.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { sendEmail } from '../utils/email.ts';

// ── Fail fast ─────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ FATAL: JWT_SECRET environment variable is not set.');
}

// Cookie parser helper (since cookie-parser is not registered in Express middleware)
const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    if (name) {
      const rawValue = parts.slice(1).join('=');
      try {
        cookies[name] = decodeURIComponent(rawValue);
      } catch {
        cookies[name] = rawValue;
      }
    }
  });
  return cookies;
};

// Helper to get raw IP address safely in Express
const getIpAddress = (req: AuthRequest): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }
  return req.ip || null;
};

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password, full_name, avatar_url, whatsapp_number } = req.body;

  try {
    // Check duplicate
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return next(new AppError('An account with this email already exists.', 409));
    }

    // Hash with cost factor 12 (bcrypt default 10 is okay; 12 is stronger)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Fetch the customer role ID
    const customerRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'customer'");
    if (customerRoleRes.rows.length === 0) {
      return next(new AppError('Customer role does not exist.', 500));
    }
    const customerRoleId = customerRoleRes.rows[0].id;

    // Generate email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, avatar_url, role_id, email_verification_token, email_verification_expires_at, whatsapp_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, full_name, created_at`,
      [
        email.toLowerCase().trim(),
        hashedPassword,
        full_name.trim(),
        avatar_url ?? null,
        customerRoleId,
        hashedVerificationToken,
        verificationExpiry,
        whatsapp_number ? String(whatsapp_number).trim() : null,
      ]
    );

    const newUser = result.rows[0];

    // Send verification email
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${rawVerificationToken}`;
    await sendEmail(
      newUser.email,
      'Verify Your Claire Skiin Account',
      `Welcome to Claire Skiin! Please verify your email by clicking the following link: ${verificationUrl}`,
      `<p>Welcome to Claire Skiin!</p><p>Please verify your email by clicking <a href="${verificationUrl}">here</a>.</p>`
    );

    sendSuccess(res, {
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: 'customer',
        email_verified: false,
        created_at: newUser.created_at
      }
    }, 'Account created successfully. Please check your email for a verification link.', 201);
  } catch (error) {
    next(error);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    // Check account lockout
    if (user) {
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const timeRemaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000));
        return next(new AppError(`Account is temporarily locked. Please try again after ${timeRemaining} minutes.`, 403));
      }
    }

    const dummyHash = '$2b$12$invalidhashusedtopreventsideChannel00000000000000000000';
    const isMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!isMatch) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      if (failedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [failedAttempts, lockUntil, user.id]
        );
        return next(new AppError('Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.', 403));
      } else {
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [failedAttempts, user.id]
        );
        return next(new AppError('Invalid email or password.', 401));
      }
    }

    // Success! Reset failed attempts and lockout
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // Issue short-lived access token (expires in 15 minutes)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'customer' },
      JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Generate Refresh Token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = getIpAddress(req);

    // Save refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, hashedRefreshToken, refreshExpiry, userAgent, ipAddress]
    );

    // Set HTTP-Only Cookie
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'customer',
        email_verified: user.email_verified_at !== null
      },
    }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// ── Get profile ───────────────────────────────────────────────────────────────
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.whatsapp_number, r.name as role, u.created_at, (u.email_verified_at IS NOT NULL) as email_verified
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return next(new AppError('User not found.', 404));
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ── Update profile (whatsapp_number etc.) ─────────────────────────────────────────
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { full_name, whatsapp_number } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (full_name !== undefined)      { updates.push(`full_name = $${i++}`);      values.push(String(full_name).trim()); }
    if (whatsapp_number !== undefined) { updates.push(`whatsapp_number = $${i++}`); values.push(whatsapp_number ? String(whatsapp_number).trim() : null); }

    if (updates.length === 0) return next(new AppError('No fields to update.', 400));

    values.push(req.user!.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, email, full_name, whatsapp_number, avatar_url`,
      values
    );
    sendSuccess(res, result.rows[0], 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};


// ── Refresh ───────────────────────────────────────────────────────────────────
export const refresh = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies['refreshToken'];

  if (!refreshToken) {
    return next(new AppError('Refresh token is required.', 401));
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await pool.query(
      `SELECT rt.id as token_id, rt.user_id, u.email, r.name as role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE rt.token_hash = $1 
         AND rt.revoked_at IS NULL 
         AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Invalid or expired refresh token.', 401));
    }

    const { token_id, user_id, email, role } = result.rows[0];

    // Revoke the old token (Refresh Token Rotation)
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [token_id]
    );

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user_id, email, role: role || 'customer' },
      JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Generate new refresh token
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = getIpAddress(req);

    // Save new refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, newHashedRefreshToken, refreshExpiry, userAgent, ipAddress]
    );

    // Set updated cookie
    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    sendSuccess(res, { token: newAccessToken }, 'Token refreshed successfully.');
  } catch (error) {
    next(error);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies['refreshToken'];

  try {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      // Revoke token
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user) {
      // To prevent user enumeration, we still return a generic success message
      sendSuccess(res, null, 'If that email address is active in our system, you will receive a password reset link shortly.');
      return;
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
      [hashedResetToken, expiry, user.id]
    );

    // Send email
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      'Password Reset Request - Claire Skiin',
      `You requested a password reset. Please click on the link to reset your password: ${resetUrl}`,
      `<p>You requested a password reset.</p><p>Please click <a href="${resetUrl}">here</a> to reset your password.</p>`
    );

    sendSuccess(res, null, 'Password reset link sent successfully.');
  } catch (error) {
    next(error);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { token, password } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()',
      [hashedToken]
    );
    const user = result.rows[0];

    if (!user) {
      return next(new AppError('Invalid or expired password reset token.', 400));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password AND invalidate current reset token
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    // Revoke all refresh tokens for this user
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1',
      [user.id]
    );

    sendSuccess(res, null, 'Password reset successfully.');
  } catch (error) {
    next(error);
  }
};

// ── Verify Email ──────────────────────────────────────────────────────────────
export const verifyEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    return next(new AppError('Verification token is required.', 400));
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = $1 AND email_verification_expires_at > NOW()',
      [hashedToken]
    );
    const user = result.rows[0];

    if (!user) {
      return next(new AppError('Invalid or expired verification token.', 400));
    }

    await pool.query(
      `UPDATE users 
       SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL 
       WHERE id = $1`,
      [user.id]
    );

    // Redirect to login page with a success message query param
    const frontendUrl = process.env.SHARED_APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?email_verified=true`);
  } catch (error) {
    next(error);
  }
};

