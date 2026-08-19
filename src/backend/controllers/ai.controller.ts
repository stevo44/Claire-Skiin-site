import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service.ts';
import { AppError } from '../middleware/error.middleware.ts';

export const getFrequentlyBoughtTogether = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const recommendations = await AIService.getFrequentlyBoughtTogether(productId);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
};

export const getPersonalizedRecommendations = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const recommendations = await AIService.getPersonalizedRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
};

export const getTrendingProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendations = await AIService.getTrendingProducts();
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
};

export const exportEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const events = await AIService.exportEventsForML(startDate as string, endDate as string);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=events_export.json');
    
    res.json(events);
  } catch (error) {
    next(error);
  }
};
