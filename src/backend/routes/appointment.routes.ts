import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware.ts';
import { requirePermission } from '../middleware/admin.middleware.ts';
import {
  getSpaServicesController,
  getSpaSlotsController,
  createAppointmentController,
  getCustomerAppointmentsController,
  cancelAppointmentController,
  rescheduleAppointmentController,
  getAdminAppointmentsController,
  updateAppointmentStatusController,
  assignStaffController,
  createSlotController,
  updateSlotController,
  deleteSlotController,
} from '../controllers/appointment.controller.ts';

const router = Router();

// --- Public / Customer Routes ---
router.get('/spa-services', getSpaServicesController);
router.get('/spa-slots', getSpaSlotsController);
router.post('/appointments', optionalAuthenticateToken, createAppointmentController);

// --- Authenticated Customer Routes ---
router.get('/appointments/mine', authenticateToken, getCustomerAppointmentsController);
router.put('/appointments/:id/cancel', authenticateToken, cancelAppointmentController);
router.put('/appointments/:id/reschedule', authenticateToken, rescheduleAppointmentController);

// --- Admin / Staff Routes ---
router.get('/admin/appointments', authenticateToken, requirePermission('appointments:view'), getAdminAppointmentsController);
router.put('/admin/appointments/:id/status', authenticateToken, requirePermission('appointments:update_status'), updateAppointmentStatusController);
router.put('/admin/appointments/:id/assign-staff', authenticateToken, requirePermission('appointments:update_status'), assignStaffController);

// Admin Time Slots management
router.post('/admin/spa-slots', authenticateToken, requirePermission('appointments:update_status'), createSlotController);
router.put('/admin/spa-slots/:id', authenticateToken, requirePermission('appointments:update_status'), updateSlotController);
router.delete('/admin/spa-slots/:id', authenticateToken, requirePermission('appointments:update_status'), deleteSlotController);

export { router as appointmentRouter };
