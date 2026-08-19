import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { requirePermission } from '../middleware/admin.middleware.ts';
import { validate, productSchemas, couponSchemas, reviewSchemas } from '../middleware/validation.middleware.ts';
import { uploadImage } from '../middleware/upload.middlewear.ts';
import { uploadProductImage } from '../controllers/upload.controllers.ts';
import * as adminController from '../controllers/admin.controller.ts';
import * as adminProductController from '../controllers/admin-product.controller.ts';
import * as adminOrderController from '../controllers/admin-order.controller.ts';
import * as adminUserController from '../controllers/admin-user.controller.ts';
import * as adminAnalyticsController from '../controllers/admin-analytics.controller.ts';
import * as aiController from '../controllers/ai.controller.ts';
import {
  listCouponsController,
  createCouponController,
  updateCouponController,
  deactivateCouponController,
} from '../controllers/coupon.controller.ts';
import {
  adminListReviewsController,
  adminUpdateReviewStatusController,
  adminListReportsController,
  adminUpdateReportStatusController,
} from '../controllers/review.controller.ts';
import {
  getSettings,
  updateSetting,
  getShippingRates,
  updateShippingRate,
  createShippingRate,
} from '../controllers/admin-settings.controller.ts';
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  listAgencyCoverage,
  addAgencyCoverage,
  updateAgencyCoverage,
  deleteAgencyCoverage,
} from '../controllers/shipping.controller.ts';

const router = Router();
router.use(authenticateToken);

// ── Image Upload ──────────────────────────────────────────────────────────
router.post(
  '/upload/image',
  requirePermission('inventory:update'),
  uploadImage.single('image'),
  uploadProductImage
);

// ── Dashboard & Analytics ─────────────────────────────────────────────────
router.get('/dashboard/kpis',              requirePermission('analytics:view'), adminController.getDashboardKPIs);
router.get('/analytics/revenue-trends',    requirePermission('analytics:view'), adminController.getRevenueTrends);
router.get('/analytics/most-viewed',       requirePermission('analytics:view'), adminAnalyticsController.getMostViewedProducts);
router.get('/analytics/most-purchased',    requirePermission('analytics:view'), adminAnalyticsController.getMostPurchasedProducts);
router.get('/analytics/conversion-rate',   requirePermission('analytics:view'), adminAnalyticsController.getConversionRate);
router.get('/analytics/abandonment-rate',  requirePermission('analytics:view'), adminAnalyticsController.getCartAbandonmentRate);
router.get('/analytics/activity-trends',   requirePermission('analytics:view'), adminAnalyticsController.getUserActivityTrends);

// ── Products ──────────────────────────────────────────────────────────────
router.get('/products',        requirePermission('inventory:update'), adminProductController.getProducts);
router.post('/products',       requirePermission('inventory:update'), validate(productSchemas.create), adminProductController.createProduct);
router.put('/products/:id',    requirePermission('inventory:update'), validate(productSchemas.update), adminProductController.updateProduct);
router.delete('/products/:id', requirePermission('products:delete'), adminProductController.deleteProduct);

import { refundPaymentController } from '../controllers/payment.controller.ts';

// ── Orders & Payments ──────────────────────────────────────────────────────
router.get('/orders',              requirePermission('orders:view'), adminOrderController.getOrders);
router.get('/orders/:id',          requirePermission('orders:view'), adminOrderController.getOrderById);
router.put('/orders/:id/status',   requirePermission('orders:update_status'), adminOrderController.updateOrderStatus);
router.post('/payments/:paymentId/refund', requirePermission('payments:refund'), refundPaymentController);

// ── Users ─────────────────────────────────────────────────────────────────
router.get('/users',               requirePermission('users:manage'), adminUserController.getUsers);
router.get('/users/:id/activity',  requirePermission('users:manage'), adminUserController.getUserActivity);
router.put('/users/:id/role',      requirePermission('users:manage'), adminUserController.updateUserRole);

// ── AI & Export ───────────────────────────────────────────────────────────
router.get('/ai/export-events', requirePermission('analytics:view'), aiController.exportEvents);

// ── Coupons ───────────────────────────────────────────────────────────────
router.get('/coupons',        requirePermission('coupons:manage'), listCouponsController);
router.post('/coupons',       requirePermission('coupons:manage'), validate(couponSchemas.create), createCouponController);
router.put('/coupons/:id',    requirePermission('coupons:manage'), validate(couponSchemas.update), updateCouponController);
router.delete('/coupons/:id', requirePermission('coupons:manage'), deactivateCouponController);

// ── Reviews (Moderation) ──────────────────────────────────────────────────
router.get('/reviews',                   requirePermission('reviews:moderate'), adminListReviewsController);
router.put('/reviews/:id/status',        requirePermission('reviews:moderate'), validate(reviewSchemas.adminStatus), adminUpdateReviewStatusController);
router.get('/reviews/reports',           requirePermission('reviews:moderate'), adminListReportsController);
router.put('/reviews/reports/:id/status', requirePermission('reviews:moderate'), validate(reviewSchemas.adminReportStatus), adminUpdateReportStatusController);

// ── Settings (financial/business config — manager+ only, not staff) ────────
router.get('/settings',          requirePermission('products:delete'), getSettings);
router.put('/settings/:key',     requirePermission('products:delete'), updateSetting);

// ── Shipping Rates (financial/business config — manager+ only, not staff) ──
router.get('/shipping-rates',          requirePermission('products:delete'), getShippingRates);
router.post('/shipping-rates',         requirePermission('products:delete'), createShippingRate);
router.put('/shipping-rates/:id',      requirePermission('products:delete'), updateShippingRate);

// ── Agencies (transport operators for inter-city shipping) ──────────────────
router.get('/agencies',                          requirePermission('products:delete'), listAgencies);
router.post('/agencies',                         requirePermission('products:delete'), createAgency);
router.put('/agencies/:id',                      requirePermission('products:delete'), updateAgency);
router.delete('/agencies/:id',                   requirePermission('products:delete'), deleteAgency);
router.get('/agencies/:id/coverage',             requirePermission('products:delete'), listAgencyCoverage);
router.post('/agencies/:id/coverage',            requirePermission('products:delete'), addAgencyCoverage);
router.put('/agencies/coverage/:coverageId',     requirePermission('products:delete'), updateAgencyCoverage);
router.delete('/agencies/coverage/:coverageId',  requirePermission('products:delete'), deleteAgencyCoverage);

export { router as adminRouter };

