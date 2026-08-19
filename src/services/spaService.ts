import api from './api';

export interface SpaServiceItem {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: number | string;
  category: string;
  image_url?: string;
}

export interface TimeSlotItem {
  id: number | string;
  time: string;
  label: string;
  available: boolean;
}

export interface ApiSpaBooking {
  id: number | string;
  appointmentNumber: string;
  userId?: number | null;
  staffId?: number | null;
  staffName?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  timeSlotLabel: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  totalPrice: number | string;
  createdAt: string;
  procedures: { id: number; name: string; price: number; duration: number }[];
}

export interface CreateBookingPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceIds: number[];
  date: string;
  time: string;
  timeSlotLabel?: string;
  notes?: string;
}

export const getSpaServices = async (): Promise<SpaServiceItem[]> => {
  const res = await api.get('/spa-services');

  return Array.isArray(res.data?.data)
    ? res.data.data
    : [];
};

export const getSpaSlots = async (): Promise<TimeSlotItem[]> => {
  const res = await api.get('/spa-slots');

  return Array.isArray(res.data?.data)
    ? res.data.data
    : [];
};

export const createBooking = async (payload: CreateBookingPayload): Promise<ApiSpaBooking> => {
  const res = await api.post('/appointments', payload);
  return res.data.data;
};

export const getMyBookings = async (): Promise<ApiSpaBooking[]> => {
  const res = await api.get('/appointments/mine');
  return res.data.data;
};

export const cancelBooking = async (id: number | string): Promise<ApiSpaBooking> => {
  const res = await api.put(`/appointments/${id}/cancel`);
  return res.data.data;
};

export const rescheduleBooking = async (id: number | string, date: string, time: string, timeSlotLabel?: string): Promise<ApiSpaBooking> => {
  const res = await api.put(`/appointments/${id}/reschedule`, { date, time, timeSlotLabel });
  return res.data.data;
};

// --- Admin APIs ---

export const getAdminBookings = async (filters?: { date?: string; status?: string; staffId?: number }): Promise<ApiSpaBooking[]> => {
  const res = await api.get('/admin/appointments', { params: filters });
  return res.data.data;
};

export const updateBookingStatus = async (id: number | string, status: string): Promise<ApiSpaBooking> => {
  const res = await api.put(`/admin/appointments/${id}/status`, { status });
  return res.data.data;
};

export const assignStaffToBooking = async (id: number | string, staffId: number | null): Promise<ApiSpaBooking> => {
  const res = await api.put(`/admin/appointments/${id}/assign-staff`, { staffId });
  return res.data.data;
};

export const addAdminSlot = async (time: string, label: string): Promise<TimeSlotItem> => {
  const res = await api.post('/admin/spa-slots', { time, label });
  return res.data.data;
};

export const updateAdminSlot = async (id: number | string, payload: { time: string; label: string; available: boolean }): Promise<TimeSlotItem> => {
  const res = await api.put(`/admin/spa-slots/${id}`, payload);
  return res.data.data;
};

export const deleteAdminSlot = async (id: number | string): Promise<void> => {
  await api.delete(`/admin/spa-slots/${id}`);
};
