import { Request, Response } from 'express';
import { AdminAnalyticsService } from '../services/admin-analytics.service.ts';
import logger from '../utils/logger.ts';

export const getMostViewedProducts = async (req: Request, res: Response) => {
  try {
    const products = await AdminAnalyticsService.getMostViewedProducts();
    res.json(products);
  } catch (error) {
    logger.error('Error fetching most viewed products:', error);
    res.status(500).json({ message: 'Internal server error fetching most viewed products' });
  }
};

export const getMostPurchasedProducts = async (req: Request, res: Response) => {
  try {
    const products = await AdminAnalyticsService.getMostPurchasedProducts();
    res.json(products);
  } catch (error) {
    logger.error('Error fetching most purchased products:', error);
    res.status(500).json({ message: 'Internal server error fetching most purchased products' });
  }
};

export const getConversionRate = async (req: Request, res: Response) => {
  try {
    const rate = await AdminAnalyticsService.getConversionRate();
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching conversion rate:', error);
    res.status(500).json({ message: 'Internal server error fetching conversion rate' });
  }
};

export const getCartAbandonmentRate = async (req: Request, res: Response) => {
  try {
    const rate = await AdminAnalyticsService.getCartAbandonmentRate();
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
