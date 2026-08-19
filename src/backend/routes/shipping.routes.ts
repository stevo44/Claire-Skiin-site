import { Router } from 'express';
import { getShippingTowns, getAgenciesForTown } from '../controllers/shipping.controller.ts';

const router = Router();

/**
 * GET /api/shipping/towns
 * Public — returns available destination towns with delivery method flags.
 */
router.get('/towns', getShippingTowns);

/**
 * GET /api/shipping/agencies?town=Douala
 * Public — returns agencies serving Buea → <town>.
 */
router.get('/agencies', getAgenciesForTown);

export { router as shippingRouter };
