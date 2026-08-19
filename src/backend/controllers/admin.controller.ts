import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.ts';
import logger from '../utils/logger.ts';

export const getDashboardKPIs = async (req: Request, res: Response) => {
  try {
    const kpis = await AdminService.getDashboardKPIs();
    res.json(kpis);
  } catch (error) {
    logger.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({ message: 'Internal server error fetching dashboard KPIs' });
  }
};

export const getRevenueTrends = async (req: Request, res: Response) => {
  try {
    const trends = await AdminService.getRevenueTrends();
    res.json(trends);
  } catch (error) {
    logger.error('Error fetching revenue trends:', error);
    res.status(500).json({ message: 'Internal server error fetching revenue trends' });
  }
};
