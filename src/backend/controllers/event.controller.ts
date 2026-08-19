import { Request, Response } from 'express';
import pool from '../config/db.ts';
import logger from '../utils/logger.ts';

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

    const query = `
      INSERT INTO events (user_id, session_id, event_type, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;

    const result = await pool.query(query, [userId, session_id || null, event_type, JSON.stringify(metadata)]);

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
