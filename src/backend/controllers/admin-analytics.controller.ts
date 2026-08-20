import { Request, Response } from 'express';
import { AdminAnalyticsService } from '../services/admin-analytics.service.ts';
import { sendSuccess } from '../utils/response.ts';
import logger from '../utils/logger.ts';

export const getMostViewedProducts = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const products = await AdminAnalyticsService.getMostViewedProducts(
      range === '7d' ? subDays(7) : range === '90d' ? subDays(90) : subDays(30),
    );
    res.json(products);
  } catch (error) {
    logger.error('Error fetching most viewed products:', error);
    res.status(500).json({ message: 'Internal server error fetching most viewed products' });
  }
};

export const getMostPurchasedProducts = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const products = await AdminAnalyticsService.getMostPurchasedProducts(
      range === '7d' ? subDays(7) : range === '90d' ? subDays(90) : subDays(30),
    );
    res.json(products);
  } catch (error) {
    logger.error('Error fetching most purchased products:', error);
    res.status(500).json({ message: 'Internal server error fetching most purchased products' });
  }
};

export const getConversionRate = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const rate = await AdminAnalyticsService.getConversionRate(
      range === '7d' ? subDays(7) : range === '90d' ? subDays(90) : subDays(30),
    );
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching conversion rate:', error);
    res.status(500).json({ message: 'Internal server error fetching conversion rate' });
  }
};

export const getCartAbandonmentRate = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const rate = await AdminAnalyticsService.getCartAbandonmentRate(
      range === '7d' ? subDays(7) : range === '90d' ? subDays(90) : subDays(30),
    );
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching cart abandonment rate:', error);
    res.status(500).json({ message: 'Internal server error fetching cart abandonment rate' });
  }
};

export const getUserActivityTrends = async (req: Request, res: Response) => {
  try {
    const trends = await AdminAnalyticsService.getUserActivityTrends();
    res.json(trends);
  } catch (error) {
    logger.error('Error fetching user activity trends:', error);
    res.status(500).json({ message: 'Internal server error fetching user activity trends' });
  }
};

/**
 * @desc    Unified analytics dashboard — returns all sections in one call.
 * @route   GET /api/admin/analytics/dashboard?range=30d
 * @access  analytics:view
 *
 * The frontend makes ONE network request and gets every metric, chart, and
 * list the Analytics page needs.  All queries run in parallel server-side.
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const data = await AdminAnalyticsService.getDashboard(range);
    sendSuccess(res, data);
  } catch (error) {
    logger.error('Error fetching analytics dashboard:', error);
    res.status(500).json({ message: 'Internal server error fetching analytics dashboard' });
  }
};

// ── local helper ──────────────────────────────────────────────────────────
function subDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
