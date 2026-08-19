import pool from '../config/db.ts';
import { AppError } from '../middleware/error.middleware.ts';
import { emitEvent } from '../utils/socket.ts';
import logger from '../utils/logger.ts';
import { NotificationService } from './notification.service.ts';

export interface CreateAppointmentDTO {
  userId?: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceIds: number[];
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00"
  timeSlotLabel?: string;
  notes?: string;
}

export class AppointmentService {
  /**
   * Get all active spa services
   */
  static async getSpaServices() {
    const query = 'SELECT * FROM spa_services WHERE is_active = true ORDER BY id ASC';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get all available time slots
   */
  static async getSpaSlots() {
    const query = 'SELECT * FROM spa_slots ORDER BY time ASC';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Create a new appointment with double-booking prevention in DB transaction
   */
  static async createAppointment(dto: CreateAppointmentDTO) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Double-booking check: lock row check for matching date & time
      const conflictCheckQuery = `
        SELECT id FROM appointments 
        WHERE appointment_date = $1 
          AND appointment_time = $2 
          AND status IN ('pending', 'confirmed') 
        FOR UPDATE
      `;
      const conflictResult = await client.query(conflictCheckQuery, [dto.date, dto.time]);

      if (conflictResult.rows.length > 0) {
        throw new AppError('The selected date and time slot is no longer available. Please choose another time slot.', 409);
      }

      // 2. Fetch selected services & calculate total price
      let totalPrice = 0;
      const servicesToAttach: { id: number; price: number }[] = [];

      if (dto.serviceIds && dto.serviceIds.length > 0) {
        const servicesQuery = 'SELECT id, price FROM spa_services WHERE id = ANY($1::int[]) AND is_active = true';
        const servicesResult = await client.query(servicesQuery, [dto.serviceIds]);
        for (const s of servicesResult.rows) {
          const price = parseFloat(s.price);
          totalPrice += price;
          servicesToAttach.push({ id: s.id, price });
        }
      }

      // Generate appointment number
      const appointmentNumber = 'SPA-' + Math.floor(10000 + Math.random() * 90000);

      // 3. Insert appointment
      const insertAppointmentQuery = `
        INSERT INTO appointments (
          appointment_number, user_id, customer_name, customer_email, customer_phone,
          appointment_date, appointment_time, time_slot_label, notes, total_price, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING *
      `;
      const apptResult = await client.query(insertAppointmentQuery, [
        appointmentNumber,
        dto.userId || null,
        dto.customerName,
        dto.customerEmail,
        dto.customerPhone,
        dto.date,
        dto.time,
        dto.timeSlotLabel || dto.time,
        dto.notes || null,
        totalPrice,
      ]);

      const appointment = apptResult.rows[0];

      // 4. Insert junction table records
      for (const s of servicesToAttach) {
        await client.query(
          'INSERT INTO appointment_services (appointment_id, service_id, price_at_booking) VALUES ($1, $2, $3)',
          [appointment.id, s.id, s.price]
        );
      }

      await client.query('COMMIT');

      // Fetch complete record with procedures list for return & socket emission
      const fullAppointment = await this.getAppointmentById(appointment.id);
      
      emitEvent('appointment_created', fullAppointment);
      logger.info(`📅 Appointment created: ${appointmentNumber} for ${dto.customerName}`);

      // Notify admins/staff of new appointment
      await NotificationService.createForPermissionHolders(
        'appointments:view',
        'appointment_created',
        'New Appointment Booked',
        `${dto.customerName} booked an appointment for ${dto.date} at ${dto.time}`,
        `/admin/appointments/${appointment.id}`
      );

      // If user is logged in, notify them too
      if (dto.userId) {
        await NotificationService.createNotification({
          userId: dto.userId,
          type: 'appointment_created',
          title: 'Appointment Request Received',
          body: `Your appointment request for ${dto.date} at ${dto.time} has been received and is pending confirmation.`,
          link: `/appointments/${appointment.id}`,
          sendEmail: true,
          emailSubject: 'Appointment Request Received - Claire Skiin',
          emailText: `Hi ${dto.customerName},\n\nYour appointment request for ${dto.date} at ${dto.time} has been received and is pending confirmation. We'll notify you once it's confirmed.\n\nThank you for choosing Claire Skiin!`,
        });
      }

      return fullAppointment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get full appointment details including procedure names
   */
  static async getAppointmentById(id: number) {
    const query = `
      SELECT 
        a.id,
        a.appointment_number AS "appointmentNumber",
        a.user_id AS "userId",
        a.staff_id AS "staffId",
        u.full_name AS "staffName",
        a.customer_name AS "customerName",
        a.customer_email AS "customerEmail",
        a.customer_phone AS "customerPhone",
        a.appointment_date::text AS "date",
        a.appointment_time AS "time",
        a.time_slot_label AS "timeSlotLabel",
        a.status,
        a.notes,
        a.total_price AS "totalPrice",
        a.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS procedures
      FROM appointments a
      LEFT JOIN users u ON a.staff_id = u.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN spa_services s ON aps.service_id = s.id
      WHERE a.id = $1
      GROUP BY a.id, u.full_name
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      throw new AppError('Appointment not found', 404);
    }
    return result.rows[0];
  }

  /**
   * Get appointments for logged in customer
   */
  static async getCustomerAppointments(userId: number) {
    const query = `
      SELECT 
        a.id,
        a.appointment_number AS "appointmentNumber",
        a.customer_name AS "customerName",
        a.customer_email AS "customerEmail",
        a.customer_phone AS "customerPhone",
        a.appointment_date::text AS "date",
        a.appointment_time AS "time",
        a.time_slot_label AS "timeSlotLabel",
        a.status,
        a.notes,
        a.total_price AS "totalPrice",
        a.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS procedures
      FROM appointments a
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN spa_services s ON aps.service_id = s.id
      WHERE a.user_id = $1
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(id: number, userId: number, isStaffOrAdmin: boolean) {
    const appt = await this.getAppointmentById(id);

    if (appt.userId !== userId && !isStaffOrAdmin) {
      throw new AppError('Unauthorized: You cannot cancel this appointment.', 403);
    }

    if (appt.status === 'cancelled') {
      throw new AppError('Appointment is already cancelled.', 400);
    }

    const updateQuery = 'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    await pool.query(updateQuery, ['cancelled', id]);

    const updatedAppt = await this.getAppointmentById(id);
    emitEvent('appointment_updated', updatedAppt);

    // Notify customer of cancellation
    if (appt.userId) {
      await NotificationService.createNotification({
        userId: appt.userId,
        type: 'appointment_status_changed',
        title: 'Appointment Cancelled',
        body: `Your appointment ${appt.appointmentNumber} on ${appt.date} at ${appt.time} has been cancelled.`,
        link: `/appointments/${id}`,
        sendEmail: true,
        emailSubject: `Appointment Cancelled - ${appt.appointmentNumber}`,
        emailText: `Hi ${appt.customerName},\n\nYour appointment ${appt.appointmentNumber} scheduled for ${appt.date} at ${appt.time} has been cancelled.\n\nIf you'd like to rebook, please visit our spa services page.\n\nThank you, Claire Skiin`,
      });
    }

    return updatedAppt;
  }

  /**
   * Reschedule appointment
   */
  static async rescheduleAppointment(id: number, userId: number, isStaffOrAdmin: boolean, newDate: string, newTime: string, newTimeSlotLabel?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const apptRes = await client.query('SELECT * FROM appointments WHERE id = $1 FOR UPDATE', [id]);
      if (apptRes.rows.length === 0) {
        throw new AppError('Appointment not found', 404);
      }
      const appt = apptRes.rows[0];

      if (appt.user_id !== userId && !isStaffOrAdmin) {
        throw new AppError('Unauthorized: You cannot reschedule this appointment.', 403);
      }

      // Check slot availability
      const conflictQuery = `
        SELECT id FROM appointments 
        WHERE appointment_date = $1 
          AND appointment_time = $2 
          AND status IN ('pending', 'confirmed')
          AND id != $3
        FOR UPDATE
      `;
      const conflictRes = await client.query(conflictQuery, [newDate, newTime, id]);
      if (conflictRes.rows.length > 0) {
        throw new AppError('The requested new date and time slot is already taken.', 409);
      }

      await client.query(
        'UPDATE appointments SET appointment_date = $1, appointment_time = $2, time_slot_label = $3, updated_at = NOW() WHERE id = $4',
        [newDate, newTime, newTimeSlotLabel || newTime, id]
      );

      await client.query('COMMIT');

      const updatedAppt = await this.getAppointmentById(id);
      emitEvent('appointment_updated', updatedAppt);

      // Notify customer of reschedule
      if (appt.user_id) {
        await NotificationService.createNotification({
          userId: appt.user_id,
          type: 'appointment_status_changed',
          title: 'Appointment Rescheduled',
          body: `Your appointment ${appt.appointment_number} has been rescheduled to ${newDate} at ${newTime}.`,
          link: `/appointments/${id}`,
          sendEmail: true,
          emailSubject: `Appointment Rescheduled - ${appt.appointment_number}`,
          emailText: `Hi ${appt.customer_name},\n\nYour appointment ${appt.appointment_number} has been rescheduled.\n\nNew date: ${newDate}\nNew time: ${newTime}\n\nWe look forward to seeing you!\n\nThank you, Claire Skiin`,
        });
      }

      return updatedAppt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Get all appointments (filtered)
   */
  static async getAllAppointments(filters?: { date?: string; status?: string; staffId?: number }) {
    let query = `
      SELECT 
        a.id,
        a.appointment_number AS "appointmentNumber",
        a.user_id AS "userId",
        a.staff_id AS "staffId",
        u.full_name AS "staffName",
        a.customer_name AS "customerName",
        a.customer_email AS "customerEmail",
        a.customer_phone AS "customerPhone",
        a.appointment_date::text AS "date",
        a.appointment_time AS "time",
        a.time_slot_label AS "timeSlotLabel",
        a.status,
        a.notes,
        a.total_price AS "totalPrice",
        a.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS procedures
      FROM appointments a
      LEFT JOIN users u ON a.staff_id = u.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN spa_services s ON aps.service_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.date) {
      params.push(filters.date);
      query += ` AND a.appointment_date = $${params.length}`;
    }

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND a.status = $${params.length}`;
    }

    if (filters?.staffId) {
      params.push(filters.staffId);
      query += ` AND a.staff_id = $${params.length}`;
    }

    query += ' GROUP BY a.id, u.full_name ORDER BY a.appointment_date DESC, a.appointment_time ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Admin / Staff: Update status
   */
  static async updateStatus(id: number, status: string) {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`, 400);
    }

    const query = 'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    if (result.rows.length === 0) {
      throw new AppError('Appointment not found', 404);
    }

    const updatedAppt = await this.getAppointmentById(id);
    emitEvent('appointment_updated', updatedAppt);

    // Notify customer of status change (for confirmed/cancelled)
    if (updatedAppt.userId && (status === 'confirmed' || status === 'cancelled')) {
      const isConfirmed = status === 'confirmed';
      await NotificationService.createNotification({
        userId: updatedAppt.userId,
        type: 'appointment_status_changed',
        title: isConfirmed ? 'Appointment Confirmed' : 'Appointment Cancelled',
        body: `Your appointment ${updatedAppt.appointmentNumber} for ${updatedAppt.date} at ${updatedAppt.time} has been ${status}.`,
        link: `/appointments/${id}`,
        sendEmail: true,
        emailSubject: `${isConfirmed ? 'Confirmed' : 'Cancelled'}: Appointment ${updatedAppt.appointmentNumber} - Claire Skiin`,
        emailText: `Hi ${updatedAppt.customerName},\n\nYour appointment ${updatedAppt.appointmentNumber} scheduled for ${updatedAppt.date} at ${updatedAppt.time} has been ${status}.\n\n${isConfirmed ? 'We look forward to seeing you!' : 'If you have any questions, please contact us.'}\n\nThank you, Claire Skiin`,
      });
    }

    return updatedAppt;
  }

  /**
   * Admin / Staff: Assign Staff member
   */
  static async assignStaff(id: number, staffId: number | null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const apptRes = await client.query('SELECT * FROM appointments WHERE id = $1 FOR UPDATE', [id]);
      if (apptRes.rows.length === 0) {
        throw new AppError('Appointment not found', 404);
      }
      const appt = apptRes.rows[0];

      if (staffId) {
        // Validate staff user exists
        const staffUserRes = await client.query('SELECT id FROM users WHERE id = $1', [staffId]);
        if (staffUserRes.rows.length === 0) {
          throw new AppError('Specified staff member does not exist.', 400);
        }

        // Check if staff member already has an active appointment at that date & time
        const conflictRes = await client.query(
          `SELECT id FROM appointments 
           WHERE staff_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status IN ('pending', 'confirmed') AND id != $4`,
          [staffId, appt.appointment_date, appt.appointment_time, id]
        );
        if (conflictRes.rows.length > 0) {
          throw new AppError('This staff member is already assigned to another appointment at this time slot.', 409);
        }
      }

      await client.query('UPDATE appointments SET staff_id = $1, updated_at = NOW() WHERE id = $2', [staffId, id]);
      await client.query('COMMIT');

      const updatedAppt = await this.getAppointmentById(id);
      emitEvent('appointment_updated', updatedAppt);
      return updatedAppt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Time Slots CRUD ---
  static async createSlot(time: string, label: string) {
    const query = 'INSERT INTO spa_slots (time, label, available) VALUES ($1, $2, true) RETURNING *';
    const result = await pool.query(query, [time, label]);
    return result.rows[0];
  }

  static async updateSlot(id: number, time: string, label: string, available: boolean) {
    const query = 'UPDATE spa_slots SET time = $1, label = $2, available = $3 WHERE id = $4 RETURNING *';
    const result = await pool.query(query, [time, label, available, id]);
    if (result.rows.length === 0) throw new AppError('Slot not found', 404);
    return result.rows[0];
  }

  static async deleteSlot(id: number) {
    const query = 'DELETE FROM spa_slots WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) throw new AppError('Slot not found', 404);
    return result.rows[0];
  }
}
