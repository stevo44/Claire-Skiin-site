import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { PermissionRequest } from '../middleware/admin.middleware.ts';
import { AppointmentService } from '../services/appointment.service.ts';

export const getSpaServicesController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const services = await AppointmentService.getSpaServices();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

export const getSpaSlotsController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slots = await AppointmentService.getSpaSlots();
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const createAppointmentController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerName, customerEmail, customerPhone, serviceIds, date, time, timeSlotLabel, notes } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !date || !time) {
      res.status(400).json({ message: 'Missing required booking fields (customerName, customerEmail, customerPhone, date, time).' });
      return;
    }

    const appointment = await AppointmentService.createAppointment({
      userId: req.user?.id || null,
      customerName,
      customerEmail,
      customerPhone,
      serviceIds: serviceIds || [],
      date,
      time,
      timeSlotLabel,
      notes,
    });

    res.status(201).json({ success: true, message: 'Appointment booked successfully.', data: appointment });
  } catch (error) {
    next(error);
  }
};

export const getCustomerAppointmentsController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const appointments = await AppointmentService.getCustomerAppointments(req.user.id);
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

export const cancelAppointmentController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid appointment ID.' });
      return;
    }
    const userId = req.user!.id;
    const userRole = req.user?.role;
    const isStaffOrAdmin = ['admin', 'manager', 'staff'].includes(userRole || '') || (req.userPermissions?.includes('appointments:update_status') || false);

    const appointment = await AppointmentService.cancelAppointment(id, userId, isStaffOrAdmin);
    res.status(200).json({ success: true, message: 'Appointment cancelled successfully.', data: appointment });
  } catch (error) {
    next(error);
  }
};

export const rescheduleAppointmentController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid appointment ID.' });
      return;
    }
    const userId = req.user!.id;
    const userRole = req.user?.role;
    const isStaffOrAdmin = ['admin', 'manager', 'staff'].includes(userRole || '') || (req.userPermissions?.includes('appointments:update_status') || false);
    const { date, time, timeSlotLabel } = req.body;

    if (!date || !time) {
      res.status(400).json({ message: 'Missing required new date or time.' });
      return;
    }

    const appointment = await AppointmentService.rescheduleAppointment(id, userId, isStaffOrAdmin, date, time, timeSlotLabel);
    res.status(200).json({ success: true, message: 'Appointment rescheduled successfully.', data: appointment });
  } catch (error) {
    next(error);
  }
};

// --- Admin Controllers ---

export const getAdminAppointmentsController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const { date, status, staffId } = req.query;
    const filters = {
      date: date as string | undefined,
      status: status as string | undefined,
      staffId: staffId ? parseInt(staffId as string, 10) : undefined,
    };

    const appointments = await AppointmentService.getAllAppointments(filters);
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatusController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid appointment ID.' });
      return;
    }
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: 'Status is required.' });
      return;
    }

    const appointment = await AppointmentService.updateStatus(id, status);
    res.status(200).json({ success: true, message: 'Appointment status updated.', data: appointment });
  } catch (error) {
    next(error);
  }
};

export const assignStaffController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid appointment ID.' });
      return;
    }
    const { staffId } = req.body; // number or null

    const appointment = await AppointmentService.assignStaff(id, staffId !== undefined ? staffId : null);
    res.status(200).json({ success: true, message: 'Staff assigned successfully.', data: appointment });
  } catch (error) {
    next(error);
  }
};

// --- Slot Admin Controllers ---

export const createSlotController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const { time, label } = req.body;
    if (!time) {
      res.status(400).json({ message: 'Time is required.' });
      return;
    }
    const slot = await AppointmentService.createSlot(time, label || time);
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

export const updateSlotController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { time, label, available } = req.body;
    const slot = await AppointmentService.updateSlot(id, time, label, available);
    res.status(200).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

export const deleteSlotController = async (req: PermissionRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await AppointmentService.deleteSlot(id);
    res.status(200).json({ success: true, message: 'Slot deleted.' });
  } catch (error) {
    next(error);
  }
};
