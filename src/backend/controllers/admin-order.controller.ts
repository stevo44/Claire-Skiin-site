import { Request, Response } from 'express';
import { AdminOrderService } from '../services/admin-order.service.ts';
import logger from '../utils/logger.ts';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';

    const result = await AdminOrderService.getOrders(page, limit, status, startDate, endDate);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error fetching orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await AdminOrderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    logger.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Internal server error fetching order details' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await AdminOrderService.updateOrderStatus(id, status);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error updating order status' });
  }
};
