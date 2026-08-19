import { Response } from 'express';
import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import logger from '../utils/logger.ts';

/**
 * @desc Get all settings
 * @route GET /api/admin/settings
 * @access Private (products:delete tier — manager/admin only)
 */
export const getSettings = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value, description, updated_at FROM settings ORDER BY key`
    );

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      try {
        settings[row.key] = {
          value: JSON.parse(row.value),
          description: row.description,
          updated_at: row.updated_at,
        };
      } catch (error) {
        settings[row.key] = {
          value: row.value,
          description: row.description,
          updated_at: row.updated_at,
        };
      }
    }

    res.json(settings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error fetching settings' });
  }
};

/**
 * @desc Update a setting
 * @route PUT /api/admin/settings/:key
 * @access Private (products:delete tier — manager/admin only)
 */
export const updateSetting = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!key) {
      throw new AppError('Setting key is required', 400);
    }

    if (value === undefined) {
      throw new AppError('Setting value is required', 400);
    }

    const valueJson = typeof value === 'string' ? value : JSON.stringify(value);

    const result = await client.query(
      `INSERT INTO settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET 
         value = $2,
         description = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, valueJson, description || null]
    );

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0],
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      logger.error('Error updating setting:', error);
      res.status(500).json({ message: 'Internal server error updating setting' });
    }
  } finally {
    client.release();
  }
};

/**
 * @desc Get shipping rates
 * @route GET /api/admin/shipping-rates
 * @access Private (products:delete tier — manager/admin only)
 */
export const getShippingRates = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, region_name, rate, is_active, created_at, updated_at 
       FROM shipping_rates 
       ORDER BY region_name`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching shipping rates:', error);
    res.status(500).json({ message: 'Internal server error fetching shipping rates' });
  }
};

/**
 * @desc Update shipping rate
 * @route PUT /api/admin/shipping-rates/:id
 * @access Private (products:delete tier — manager/admin only)
 */
export const updateShippingRate = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { rate, is_active, region_name } = req.body;

    if (rate === undefined && is_active === undefined && !region_name) {
      throw new AppError('No fields to update', 400);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (rate !== undefined) {
      updates.push(`rate = $${paramCount}`);
      values.push(rate);
      paramCount++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (region_name) {
      updates.push(`region_name = $${paramCount}`);
      values.push(region_name);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query(
      `UPDATE shipping_rates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Shipping rate not found', 404);
    }

    res.json({
      message: 'Shipping rate updated successfully',
      shippingRate: result.rows[0],
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      logger.error('Error updating shipping rate:', error);
      res.status(500).json({ message: 'Internal server error updating shipping rate' });
    }
  } finally {
    client.release();
  }
};

/**
 * @desc Create shipping rate
 * @route POST /api/admin/shipping-rates
 * @access Private (products:delete tier — manager/admin only)
 */
export const createShippingRate = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const { region_name, rate, is_active } = req.body;

    if (!region_name || rate === undefined) {
      throw new AppError('Region name and rate are required', 400);
    }

    const result = await client.query(
      `INSERT INTO shipping_rates (region_name, rate, is_active)
       VALUES ($1, $2, $3)
       ON CONFLICT (region_name) 
       DO UPDATE SET 
         rate = $2,
         is_active = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [region_name, rate, is_active ?? true]
    );

    res.status(201).json({
      message: 'Shipping rate created successfully',
      shippingRate: result.rows[0],
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      logger.error('Error creating shipping rate:', error);
      res.status(500).json({ message: 'Internal server error creating shipping rate' });
    }
  } finally {
    client.release();
  }
};