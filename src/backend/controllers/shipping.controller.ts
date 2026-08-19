import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import { ShippingService } from '../services/shipping.service.ts';
import logger from '../utils/logger.ts';

// ── Public endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/shipping/towns
 * Returns all active destination towns from shipping_rates, each annotated with
 * which delivery method applies (Buea → local_delivery, everything else →
 * agency_shipping).  The "Other" catch-all row is excluded.
 */
export const getShippingTowns = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const towns = await ShippingService.getAvailableTowns();
    res.json({ success: true, data: towns });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/shipping/agencies?town=Douala
 * Returns agencies that serve both Buea (origin) and the requested town,
 * ordered verified-first.
 */
export const getAgenciesForTown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { town } = req.query;
    if (!town || typeof town !== 'string' || !town.trim()) {
      return next(new AppError('town query parameter is required', 400));
    }

    const agencies = await ShippingService.getAgenciesForTown(town.trim());
    res.json({ success: true, data: agencies });
  } catch (error) {
    next(error);
  }
};

// ── Admin CRUD for agencies ───────────────────────────────────────────────────

/**
 * GET /api/admin/agencies
 */
export const listAgencies = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, name, origin_location, contact_phone, is_verified, is_active, created_at, updated_at
       FROM agencies
       ORDER BY is_verified DESC, name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/agencies
 */
export const createAgency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { name, origin_location, contact_phone, is_verified, is_active } = req.body;
  if (!name || !String(name).trim()) {
    return next(new AppError('Agency name is required', 400));
  }
  try {
    const result = await pool.query(
      `INSERT INTO agencies (name, origin_location, contact_phone, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        String(name).trim(),
        origin_location ? String(origin_location).trim() : null,
        contact_phone  ? String(contact_phone).trim()  : null,
        Boolean(is_verified),
        is_active === false ? false : true,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/agencies/:id
 */
export const updateAgency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return next(new AppError('Invalid agency ID', 400));

  const { name, origin_location, contact_phone, is_verified, is_active } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (name !== undefined)            { updates.push(`name = $${i++}`);            values.push(String(name).trim()); }
    if (origin_location !== undefined) { updates.push(`origin_location = $${i++}`); values.push(origin_location ? String(origin_location).trim() : null); }
    if (contact_phone !== undefined)   { updates.push(`contact_phone = $${i++}`);   values.push(contact_phone ? String(contact_phone).trim() : null); }
    if (is_verified !== undefined)     { updates.push(`is_verified = $${i++}`);     values.push(Boolean(is_verified)); }
    if (is_active !== undefined)       { updates.push(`is_active = $${i++}`);       values.push(Boolean(is_active)); }

    if (updates.length === 0) return next(new AppError('No fields to update', 400));

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE agencies SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return next(new AppError('Agency not found', 404));
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/agencies/:id
 */
export const deleteAgency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return next(new AppError('Invalid agency ID', 400));
  try {
    const result = await pool.query(`DELETE FROM agencies WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return next(new AppError('Agency not found', 404));
    res.json({ success: true, message: 'Agency deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Admin CRUD for agency_town_coverage ──────────────────────────────────────

/**
 * GET /api/admin/agencies/:id/coverage
 */
export const listAgencyCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const agencyId = parseInt(req.params.id, 10);
  if (isNaN(agencyId)) return next(new AppError('Invalid agency ID', 400));
  try {
    const result = await pool.query(
      `SELECT id, agency_id, town_name, destination_office_location, is_verified, created_at
       FROM agency_town_coverage
       WHERE agency_id = $1
       ORDER BY town_name ASC`,
      [agencyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/agencies/:id/coverage
 */
export const addAgencyCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const agencyId = parseInt(req.params.id, 10);
  if (isNaN(agencyId)) return next(new AppError('Invalid agency ID', 400));

  const { town_name, destination_office_location, is_verified } = req.body;
  if (!town_name || !String(town_name).trim()) {
    return next(new AppError('town_name is required', 400));
  }
  try {
    const result = await pool.query(
      `INSERT INTO agency_town_coverage (agency_id, town_name, destination_office_location, is_verified)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agency_id, town_name)
       DO UPDATE SET
         destination_office_location = EXCLUDED.destination_office_location,
         is_verified = EXCLUDED.is_verified
       RETURNING *`,
      [
        agencyId,
        String(town_name).trim(),
        destination_office_location ? String(destination_office_location).trim() : null,
        Boolean(is_verified),
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/agencies/coverage/:coverageId
 */
export const updateAgencyCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const coverageId = parseInt(req.params.coverageId, 10);
  if (isNaN(coverageId)) return next(new AppError('Invalid coverage ID', 400));

  const { town_name, destination_office_location, is_verified } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (town_name !== undefined)                   { updates.push(`town_name = $${i++}`);                   values.push(String(town_name).trim()); }
    if (destination_office_location !== undefined) { updates.push(`destination_office_location = $${i++}`); values.push(destination_office_location ? String(destination_office_location).trim() : null); }
    if (is_verified !== undefined)                 { updates.push(`is_verified = $${i++}`);                 values.push(Boolean(is_verified)); }

    if (updates.length === 0) return next(new AppError('No fields to update', 400));
    values.push(coverageId);

    const result = await pool.query(
      `UPDATE agency_town_coverage SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return next(new AppError('Coverage record not found', 404));
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/agencies/coverage/:coverageId
 */
export const deleteAgencyCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const coverageId = parseInt(req.params.coverageId, 10);
  if (isNaN(coverageId)) return next(new AppError('Invalid coverage ID', 400));
  try {
    const result = await pool.query(
      `DELETE FROM agency_town_coverage WHERE id = $1 RETURNING id`,
      [coverageId]
    );
    if (result.rows.length === 0) return next(new AppError('Coverage record not found', 404));
    res.json({ success: true, message: 'Coverage record deleted' });
  } catch (error) {
    next(error);
  }
};
