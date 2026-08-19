import pool, { query } from '../config/db.ts';
import logger from '../utils/logger.ts';

/**
 * Shipping Service – delivery-method-aware shipping cost calculation.
 *
 * CRITICAL FIX (Phase 5):
 *   The old implementation had a hardcoded city→region name mapping that silently
 *   bypassed the database.  Any town added by admin after the initial seed (e.g.
 *   "Buea" at 1,500 XAF) was never reachable through the mapping, so it always
 *   fell back to the generic "Other" rate.
 *
 *   The new implementation does a **direct case-insensitive, whitespace-trimmed
 *   ILIKE lookup** against shipping_rates.region_name, then falls back to the
 *   "Other" row only if truly no match exists.  There is no hardcoded list
 *   anywhere in this file.
 */
export class ShippingService {
  /**
   * Get shipping cost for a destination town name.
   *
   * Lookup strategy (in order):
   *   1. Exact case-insensitive match on region_name      → use that rate
   *   2. No match → fall back to the "Other" row
   *   3. No "Other" row either → 0 (free, with a warning)
   *
   * @param town - Customer-entered destination town name (un-normalised is fine)
   */
  static async getShippingCost(town: string): Promise<number> {
    const normalized = town.trim();
    if (!normalized) return 0;

    // Step 1 — direct DB lookup (no hardcoded mapping)
    const matchResult = await query(
      `SELECT rate FROM shipping_rates
       WHERE LOWER(TRIM(region_name)) = LOWER($1) AND is_active = TRUE
       LIMIT 1`,
      [normalized]
    );

    if (matchResult.rows.length > 0) {
      return parseFloat(matchResult.rows[0].rate);
    }

    // Step 2 — fallback to "Other"
    const otherResult = await query(
      `SELECT rate FROM shipping_rates
       WHERE LOWER(TRIM(region_name)) = 'other' AND is_active = TRUE
       LIMIT 1`,
      []
    );

    if (otherResult.rows.length > 0) {
      logger.warn(`ShippingService: no rate for "${normalized}", falling back to Other`);
      return parseFloat(otherResult.rows[0].rate);
    }

    // Step 3 — no "Other" row either; log and return 0
    logger.error(`ShippingService: no rate found for "${normalized}" and no Other fallback.`);
    return 0;
  }

  /**
   * Return all active destination towns from shipping_rates, annotated with
   * the delivery method that applies for each.
   *
   * Buea → local_delivery (door-to-door rider)
   * Everything else → agency_shipping (customer collects from agency office)
   *
   * The "Other" catch-all is excluded from the public list — it's a backend
   * fallback, not a real selectable destination from the customer's perspective.
   */
  static async getAvailableTowns(): Promise<
    Array<{ id: number; region_name: string; rate: number; delivery_method: 'local_delivery' | 'agency_shipping' }>
  > {
    const result = await query(
      `SELECT id, region_name, CAST(rate AS FLOAT) AS rate
       FROM shipping_rates
       WHERE is_active = TRUE
         AND LOWER(TRIM(region_name)) != 'other'
       ORDER BY region_name ASC`,
      []
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      region_name: row.region_name,
      rate: row.rate,
      delivery_method: row.region_name.trim().toLowerCase() === 'buea'
        ? 'local_delivery'
        : 'agency_shipping',
    }));
  }

  /**
   * Return agencies that serve BOTH Buea (origin, always) AND the given destination
   * town, ordered by verified first then alphabetically.
   * @param townName - destination town exactly as stored in shipping_rates / agency_town_coverage
   */
  static async getAgenciesForTown(townName: string): Promise<Array<{
    id: number;
    name: string;
    origin_location: string | null;
    contact_phone: string | null;
    is_verified: boolean;
    destination_office_location: string | null;
    coverage_verified: boolean;
  }>> {
    const result = await pool.query(
      `SELECT
         a.id,
         a.name,
         a.origin_location,
         a.contact_phone,
         a.is_verified,
         atc.destination_office_location,
         atc.is_verified AS coverage_verified
       FROM agencies a
       JOIN agency_town_coverage atc ON atc.agency_id = a.id
       WHERE LOWER(TRIM(atc.town_name)) = LOWER(TRIM($1))
         AND a.is_active = TRUE
       ORDER BY
         (a.is_verified AND atc.is_verified) DESC,
         a.is_verified DESC,
         a.name ASC`,
      [townName]
    );

    return result.rows;
  }
}