import React, { useState, useEffect, useCallback } from 'react';
import { useSpa, type SpaBooking, type TimeSlot } from '../../store/spaStore';
import { showToast } from '../../components/ToastContainer';
import { useSocket } from '../../hooks/useSocket';
import {
  getAdminBookings,
  updateBookingStatus,
  assignStaffToBooking,
  addAdminSlot,
  updateAdminSlot,
  deleteAdminSlot,
  type ApiSpaBooking,
} from '../../services/spaService';
import { buildAppointmentWhatsAppLink } from '../../utils/whatsapp';

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-blue-50 text-blue-700',
  no_show:   'bg-stone-100 text-stone-500',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

export default function SpaManagementPage() {
  const { state, dispatch, refreshSlots } = useSpa();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('bookings');

  // --- Bookings ---
  const [bookings, setBookings] = useState<ApiSpaBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- Slot form ---
  const [slotForm, setSlotForm] = useState({ time: '', label: '' });
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotSaving, setSlotSaving] = useState(false);

  // --- Staff assignment modal ---
  const [assigningId, setAssigningId] = useState<string | number | null>(null);
  const [staffIdInput, setStaffIdInput] = useState('');

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const data = await getAdminBookings({
        date: filterDate || undefined,
        status: filterStatus || undefined,
      });
      setBookings(data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load bookings', 'error', 'error');
    } finally {
      setBookingsLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    loadBookings();
    refreshSlots();
  }, [loadBookings, refreshSlots]);

  // Live Socket.io updates
  useEffect(() => {
    if (!socket) return;
    const handleCreated = (booking: ApiSpaBooking) => {
      setBookings(prev => {
        if (prev.find(b => String(b.id) === String(booking.id))) return prev;
        return [booking, ...prev];
      });
    };
    const handleUpdated = (booking: ApiSpaBooking) => {
      setBookings(prev => prev.map(b => String(b.id) === String(booking.id) ? booking : b));
    };
    socket.on('appointment_created', handleCreated);
    socket.on('appointment_updated', handleUpdated);
    return () => {
      socket.off('appointment_created', handleCreated);
      socket.off('appointment_updated', handleUpdated);
    };
  }, [socket]);

  const handleUpdateStatus = async (id: string | number, status: string) => {
    try {
      const updated = await updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => String(b.id) === String(id) ? updated : b));
      showToast(`Appointment marked as ${status}`, 'check_circle');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status', 'error', 'error');
    }
  };

  const handleAssignStaff = async () => {
    if (!assigningId) return;
    try {
      const staffId = staffIdInput ? parseInt(staffIdInput, 10) : null;
      const updated = await assignStaffToBooking(assigningId, staffId);
      setBookings(prev => prev.map(b => String(b.id) === String(assigningId) ? updated : b));
      showToast('Staff assigned successfully', 'check_circle');
      setAssigningId(null);
      setStaffIdInput('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign staff', 'error', 'error');
    }
  };

  // --- Slots ---
  function formatTimeLabel(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${m === 0 ? '00' : m} ${ampm}`;
  }

  const handleSaveSlot = async () => {
    if (!slotForm.time) { showToast('Time is required', 'error', 'error'); return; }
    const label = slotForm.label.trim() || formatTimeLabel(slotForm.time);
    setSlotSaving(true);
    try {
      if (editingSlot) {
        const updated = await updateAdminSlot(editingSlot.id, { time: slotForm.time, label, available: editingSlot.available });
        dispatch({ type: 'UPDATE_SLOT', payload: updated });
        showToast('Time slot updated', 'check_circle');
      } else {
        const created = await addAdminSlot(slotForm.time, label);
        dispatch({ type: 'ADD_SLOT', payload: created });
        showToast('Time slot added', 'check_circle');
      }
      setSlotForm({ time: '', label: '' });
      setEditingSlot(null);
      setShowSlotForm(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save slot', 'error', 'error');
    } finally {
      setSlotSaving(false);
    }
  };

  const handleToggleAvailable = async (slot: TimeSlot) => {
    try {
      const updated = await updateAdminSlot(slot.id, { time: slot.time, label: slot.label, available: !slot.available });
      dispatch({ type: 'UPDATE_SLOT', payload: updated });
      showToast(`Slot ${slot.label} ${slot.available ? 'disabled' : 'enabled'}`, 'schedule');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update slot', 'error', 'error');
    }
  };

  const handleDeleteSlot = async (id: string | number) => {
    try {
      await deleteAdminSlot(id);
      dispatch({ type: 'DELETE_SLOT', payload: id });
      showToast('Slot removed', 'delete');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete slot', 'error', 'error');
    }
  };

  const sortedSlots = [...state.slots].sort((a, b) => a.time.localeCompare(b.time));
  const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="mb-8">
        <h2 className="font-headline text-3xl text-on-surface mb-2">Spa Management</h2>
        <p className="text-stone-500">Live bookings, time slots, and staff assignments.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Slots', value: state.slots.length, icon: 'schedule', color: 'text-primary' },
          { label: 'Active Slots', value: state.slots.filter(s => s.available).length, icon: 'event_available', color: 'text-green-600' },
          { label: 'Total Bookings', value: bookings.length, icon: 'book_online', color: 'text-blue-600' },
          { label: 'Pending', value: pendingCount, icon: 'pending', color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest p-5 rounded-xl border border-stone-100">
            <span className={`material-symbols-outlined text-2xl mb-2 block ${s.color}`}>{s.icon}</span>
            <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 w-fit mb-6">
        {(['bookings', 'slots'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg font-label text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white shadow-sm text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
            {tab === 'slots' ? 'Time Slots' : 'Bookings'}
          </button>
        ))}
      </div>

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="border border-outline/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-outline/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={loadBookings}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
              Refresh
            </button>
          </div>

          {bookingsLoading ? (
            <div className="flex justify-center py-16">
              <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sortedBookings.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">book_online</span>
              <p>No bookings found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBookings.map(booking => (
                <div key={booking.id} className="bg-white border border-stone-100 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className="font-headline text-base text-on-surface">{booking.customerName}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[booking.status] || ''}`}>{booking.status.replace('_', ' ')}</span>
                        <span className="text-[11px] text-stone-400 font-mono">{booking.appointmentNumber}</span>
                        {booking.staffName && <span className="text-[11px] text-green-600 flex items-center gap-1"><span className="material-symbols-outlined text-sm">person_pin</span>{booking.staffName}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 mb-2">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(booking.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{booking.timeSlotLabel || booking.time}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">phone</span>{booking.customerPhone}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">email</span>{booking.customerEmail}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {booking.procedures.map(p => (
                          <span key={p.id} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">{p.name}</span>
                        ))}
                      </div>
                      {booking.notes && <p className="text-xs text-stone-400 mt-2 italic">"{booking.notes}"</p>}
                      <p className="text-xs text-stone-400 mt-1 font-semibold">Total: {Number(booking.totalPrice).toLocaleString('fr-CM')} XAF</p>
                    </div>

                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {/* WhatsApp Notify button */}
                      <button
                        onClick={() => {
                          const link = buildAppointmentWhatsAppLink({
                            id: booking.id,
                            customerName: booking.customerName,
                            phone: booking.customerPhone,
                            serviceName: booking.procedures.map(p => p.name).join(', '),
                            date: booking.date,
                            time: booking.timeSlotLabel || booking.time,
                            status: booking.status,
                          });
                          if (link) {
                            window.open(link, '_blank');
                            showToast('Opening WhatsApp link...', 'chat');
                          } else {
                            showToast('Invalid phone format for WhatsApp', 'error', 'error');
                          }
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">chat</span>
                        WhatsApp
                      </button>

                      {/* Status update dropdown */}
                      <select
                        value={booking.status}
                        onChange={e => handleUpdateStatus(booking.id, e.target.value)}
                        className="border border-outline/20 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition-colors">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                      <button onClick={() => { setAssigningId(booking.id); setStaffIdInput(String(booking.staffId || '')); }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface-container-low border border-outline/20 rounded-lg hover:bg-surface-container transition-colors text-stone-600">
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        {booking.staffId ? 'Reassign' : 'Assign Staff'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TIME SLOTS TAB */}
      {activeTab === 'slots' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-stone-500">Operating hours: Mon–Sat, 9:00 AM – 8:00 PM</p>
            <button onClick={() => { setEditingSlot(null); setSlotForm({ time: '', label: '' }); setShowSlotForm(true); }}
              className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-5 py-2.5 rounded-xl font-label text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-md">
              <span className="material-symbols-outlined text-sm">add</span>Add Slot
            </button>
          </div>

          {showSlotForm && (
            <div className="bg-surface-container-lowest border border-outline/10 rounded-xl p-6 mb-6">
              <h3 className="font-headline text-lg mb-4">{editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-1 block">Time (24hr) *</label>
                  <input type="time" value={slotForm.time} onChange={e => setSlotForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-outline/20 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-1 block">Display Label (optional)</label>
                  <input type="text" value={slotForm.label} onChange={e => setSlotForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. 9:00 AM (auto-filled)"
                    className="w-full border border-outline/20 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowSlotForm(false); setEditingSlot(null); }}
                  className="px-4 py-2 border border-stone-200 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
                <button onClick={handleSaveSlot} disabled={slotSaving}
                  className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {slotSaving ? 'Saving…' : editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedSlots.map(slot => (
              <div key={slot.id} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${slot.available ? 'bg-white border-stone-100' : 'bg-stone-50 border-stone-200 opacity-60'}`}>
                <div>
                  <p className="font-headline text-lg">{slot.label}</p>
                  <p className={`text-[10px] font-label uppercase tracking-widest mt-0.5 ${slot.available ? 'text-green-600' : 'text-stone-400'}`}>
                    {slot.available ? 'Available' : 'Disabled'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleAvailable(slot)} title={slot.available ? 'Disable' : 'Enable'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${slot.available ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-100'}`}>
                    <span className="material-symbols-outlined text-sm">{slot.available ? 'toggle_on' : 'toggle_off'}</span>
                  </button>
                  <button onClick={() => { setEditingSlot(slot); setSlotForm({ time: slot.time, label: slot.label }); setShowSlotForm(true); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-surface-container-low hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDeleteSlot(slot.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {sortedSlots.length === 0 && (
            <div className="text-center py-16 text-stone-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">schedule</span>
              <p>No time slots yet. Add one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Staff Modal */}
      {assigningId !== null && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssigningId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h3 className="font-headline text-xl mb-4">Assign Staff Member</h3>
            <p className="text-sm text-stone-500 mb-4">Enter the User ID of the staff member to assign. Leave blank to unassign.</p>
            <input type="number" value={staffIdInput} onChange={e => setStaffIdInput(e.target.value)}
              placeholder="Staff User ID (e.g. 5)"
              className="w-full border border-outline/20 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setAssigningId(null)}
                className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
              <button onClick={handleAssignStaff}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
