import React, { useState, useEffect } from 'react';
import { useSpa } from '../store/spaStore';
import { showToast } from './ToastContainer';
import { eventService } from '../services/eventService';
import {
  getSpaServices,
  createBooking,
  type SpaServiceItem,
  type TimeSlotItem,
} from '../services/spaService';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'procedures' | 'datetime' | 'details' | 'confirm';

function getAvailableDates(): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (dates.length < 14) {
    if (d.getDay() !== 0) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function SpaBookingModal({ open, onClose }: Props) {
  const { state, dispatch, refreshSlots } = useSpa();

  const [step, setStep] = useState<Step>('procedures');
  const [services, setServices] = useState<SpaServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotItem | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const availableDates = getAvailableDates();
  const availableSlots = (state.slots ?? []).filter(s => s.available);

  // Load services when modal opens
  useEffect(() => {
    if (!open) return;
    setServicesLoading(true);
    getSpaServices()
      .then(setServices)
      .catch(() => {})
      .finally(() => setServicesLoading(false));
    refreshSlots();
  }, [open, refreshSlots]);

  const toggleProcedure = (id: number) => {
    setSelectedProcedureIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const totalPrice = selectedProcedureIds.reduce((sum, id) => {
    const svc = services.find(s => s.id === id);
    return sum + (svc ? Number(svc.price) : 0);
  }, 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const booking = await createBooking({
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        serviceIds: selectedProcedureIds,
        date: selectedDate,
        time: selectedSlot!.time,
        timeSlotLabel: selectedSlot!.label,
        notes: form.notes,
      });
      dispatch({ type: 'ADD_BOOKING', payload: booking });
      // Track successful appointment booking (Phase 3)
      eventService.trackAppointmentBooking({
        appointment_id: booking.id,
        appointment_number: booking.appointmentNumber,
        service_ids: selectedProcedureIds,
        total_price: totalPrice,
        date: selectedDate,
        time: selectedSlot?.time,
      });
      showToast(`Booking confirmed for ${formatDate(selectedDate)}! 🌿`, 'event_available');
      handleClose();
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.message || 'Failed to create booking. Please try again.';
      showToast(msg, 'error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('procedures');
    setSelectedProcedureIds([]);
    setSelectedDate('');
    setSelectedSlot(null);
    setForm({ name: '', email: '', phone: '', notes: '' });
    setErrors({});
    onClose();
  };

  if (!open) return null;

  const stepNum = { procedures: 1, datetime: 2, details: 3, confirm: 4 };
  const stepLabels = ['Procedures', 'Date & Time', 'Your Details', 'Confirm'];

  return (
    <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center px-0 md:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full md:max-w-2xl bg-[#faf9f8] rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 md:px-8 pt-6 pb-4 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-tertiary">Earthbound Sanctuary</p>
              <h2 className="font-headline text-2xl text-on-surface mt-0.5">Book Your Ritual</h2>
            </div>
            <button onClick={handleClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-error hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-1.5 ${i < stepNum[step] - 1 ? 'text-primary/60' : stepNum[step] - 1 === i ? 'text-primary' : 'text-outline/40'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${stepNum[step] - 1 === i ? 'bg-primary border-primary text-white' : i < stepNum[step] - 1 ? 'border-primary text-primary' : 'border-outline/30'}`}>
                    {i < stepNum[step] - 1 ? '✓' : i + 1}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">{label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-px transition-colors ${i < stepNum[step] - 1 ? 'bg-primary' : 'bg-outline/20'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">

          {/* Step 1: Procedures */}
          {step === 'procedures' && (
            <div>
              <p className="text-sm text-on-surface-variant mb-5">Select one or more treatments for your session.</p>
              {servicesLoading ? (
                <div className="flex justify-center py-10">
                  <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map(svc => {
                    const selected = selectedProcedureIds.includes(svc.id);
                    return (
                      <button key={svc.id} onClick={() => toggleProcedure(svc.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/40 bg-surface-container-low'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`font-semibold text-sm ${selected ? 'text-primary' : 'text-on-surface'}`}>{svc.name}</p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">{svc.duration_minutes} min</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="font-label text-xs text-tertiary font-bold">{Number(svc.price).toLocaleString('fr-CM')}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary' : 'border-outline/40'}`}>
                              {selected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 'datetime' && (
            <div>
              <div className="mb-6">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-3">Select a Date</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableDates.map(date => (
                    <button key={date} onClick={() => setSelectedDate(date)}
                      className={`py-3 px-2 rounded-xl border-2 text-sm transition-all ${selectedDate === date ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-outline-variant/20 hover:border-primary/40 text-on-surface'}`}>
                      <p className="font-semibold text-xs">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      <p className="text-base mt-0.5">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-3">Select a Time Slot</p>
                  {state.slotsLoading ? (
                    <div className="flex justify-center py-6">
                      <span className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-on-surface-variant py-4 text-center">No time slots available. Please check back later.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map(slot => (
                        <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                          className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSlot?.id === slot.id ? 'border-primary bg-primary text-white' : 'border-outline-variant/20 hover:border-primary/40 text-on-surface'}`}>
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <div className="space-y-6">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Amani Bello', type: 'text' },
                { key: 'email', label: 'Email Address', placeholder: 'you@example.com', type: 'email' },
                { key: 'phone', label: 'Phone Number', placeholder: '+237 6XX XXX XXX', type: 'tel' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="relative pt-4">
                  <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]}
                    onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
                    placeholder={placeholder}
                    className={`w-full bg-transparent border-b py-3 mt-4 outline-none transition-colors placeholder:text-on-surface/20 ${errors[key] ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`} />
                  {errors[key] && <p className="text-error text-[11px] mt-1">{errors[key]}</p>}
                </div>
              ))}
              <div className="relative pt-4">
                <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0">Special Requests (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Allergies, preferences, or anything we should know..."
                  className="w-full bg-transparent border border-outline/20 rounded-lg p-3 mt-6 outline-none transition-colors placeholder:text-on-surface/20 focus:border-tertiary resize-none text-sm" />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline">Selected Procedures</p>
                {selectedProcedureIds.map(id => {
                  const svc = services.find(s => s.id === id)!;
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span>{svc.name} <span className="text-on-surface-variant text-[11px]">· {svc.duration_minutes} min</span></span>
                      <span className="font-semibold text-primary">{Number(svc.price).toLocaleString('fr-CM')} XAF</span>
                    </div>
                  );
                })}
                <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-headline text-base">
                  <span>Estimated Total</span>
                  <span className="text-primary">{totalPrice.toLocaleString('fr-CM')} XAF</span>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-5 space-y-2 text-sm">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-2">Appointment</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">schedule</span>
                  <span>{selectedSlot?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                  <span>{form.name} · {form.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">email</span>
                  <span>{form.email}</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant text-center px-4">
                A confirmation will be sent to your email. Payment is collected at the salon.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 border-t border-outline-variant/20 shrink-0">
          {step === 'procedures' && selectedProcedureIds.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant">{selectedProcedureIds.length} procedure{selectedProcedureIds.length > 1 ? 's' : ''} selected</span>
              <span className="font-semibold text-primary text-sm">{totalPrice.toLocaleString('fr-CM')} XAF</span>
            </div>
          )}
          <div className="flex gap-3">
            {step !== 'procedures' && (
              <button onClick={() => setStep(step === 'datetime' ? 'procedures' : step === 'details' ? 'datetime' : 'details')}
                className="px-5 py-3 rounded-xl border border-outline/30 text-sm font-semibold hover:bg-surface-container-low transition-colors">
                ← Back
              </button>
            )}
            {step === 'procedures' && (
              <button disabled={selectedProcedureIds.length === 0} onClick={() => setStep('datetime')}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-40 disabled:scale-100">
                Choose Date & Time →
              </button>
            )}
            {step === 'datetime' && (
              <button disabled={!selectedDate || !selectedSlot} onClick={() => setStep('details')}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-40 disabled:scale-100">
                Enter Details →
              </button>
            )}
            {step === 'details' && (
              <button onClick={() => { if (validate()) setStep('confirm'); }}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-lg">
                Review Booking →
              </button>
            )}
            {step === 'confirm' && (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2">
                {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming...</> : '✓ Confirm Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
