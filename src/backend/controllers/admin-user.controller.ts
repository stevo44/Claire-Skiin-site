import { Request, Response } from 'express';
import { AdminUserService } from '../services/admin-user.service.ts';
import logger from '../utils/logger.ts';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';

    const result = await AdminUserService.getUsers(page, limit, search, role);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error fetching users' });
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const activity = await AdminUserService.getUserActivity(id);
    res.json(activity);
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Internal server error fetching user activity' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await AdminUserService.updateUserRole(id, role);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error updating user role' });
  }
};
