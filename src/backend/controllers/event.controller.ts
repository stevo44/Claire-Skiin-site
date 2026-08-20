import { Request, Response } from 'express';
import pool from '../config/db.ts';
import logger from '../utils/logger.ts';

/**
 * Lightweight user-agent parser — extracts device type and browser name
 * from the User-Agent header using simple substring checks.
 *
 * No external dependency (ua-parser-js is not in package.json).  This covers
 * the major browsers and device classes relevant to analytics; anything
 * unrecognized falls back to 'unknown' so the metadata is always present.
 */
function parseUserAgent(ua: string): { device: string; browser: string } {
  if (!ua) return { device: 'unknown', browser: 'unknown' };

  // Device class — check mobile/tablet first (more specific)
  let device = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk-Accelerated/i.test(ua) &&
      !/Mobile/i.test(ua)) {
    device = 'tablet';
  } else if (/Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini/i.test(ua)) {
    device = 'mobile';
  }

  // Browser — order matters (Edge contains "Chrome", Chrome contains "Safari")
  let browser = 'unknown';
  if (/Edg\//i.test(ua)) {
    browser = 'edge';
  } else if (/OPR\//i.test(ua) || /Opera Mini/i.test(ua)) {
    browser = 'opera';
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    browser = 'chrome';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'safari';
  }

  return { device, browser };
}

/**
 * @desc Track a user event
 * @route POST /api/events
 * @access Public (Optional Auth)
 */
export const trackEvent = async (req: any, res: Response) => {
  try {
    const { event_type, session_id, metadata = {} } = req.body;
    const userId = req.user?.id || null; // Support guest tracking

    if (!event_type) {
      return res.status(400).json({ message: 'Event type is required' });
    }

    // Enrich metadata with device/browser info parsed from User-Agent.
    // Only adds the fields if they aren't already present in the client
    // payload (client takes precedence for any custom overrides).
    const ua = req.headers['user-agent'] || '';
    const { device, browser } = parseUserAgent(ua);
    const enrichedMetadata = {
      device,
      browser,
      ...metadata,
    };

    const query = `
      INSERT INTO events (user_id, session_id, event_type, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;

    const result = await pool.query(query, [userId, session_id || null, event_type, JSON.stringify(enrichedMetadata)]);

    // Return 202 Accepted for high-volume tracking (fire and forget pattern)
    res.status(202).json({
      message: 'Event tracked',
      eventId: result.rows[0].id
    });
  } catch (error) {
    logger.error('Error tracking event:', error);
    // Don't crash the client if tracking fails
    res.status(500).json({ message: 'Internal server error tracking event' });
  }
};

/**
 * @desc Get aggregated analytics (Example for AI/Admin)
 * @route GET /api/events/analytics
 * @access Private (Admin Only - simplified here)
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        event_type, 
        COUNT(*) as count,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM events
      GROUP BY event_type
      ORDER BY count DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Internal server error fetching analytics' });
  }
};
