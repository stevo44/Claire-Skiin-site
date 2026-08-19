import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../components/ToastContainer';
import ConfirmModal from './ConfirmModal';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  redemption_count: number;
  created_at: string;
}

interface CouponForm {
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const emptyForm: CouponForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '15',
  min_order_amount: '',
  max_uses: '',
  max_uses_per_user: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminService.getCoupons();
      setCoupons(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load coupons', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
      max_uses_per_user: c.max_uses_per_user ? String(c.max_uses_per_user) : '',
      starts_at: c.starts_at ? c.starts_at.substring(0, 10) : '',
      expires_at: c.expires_at ? c.expires_at.substring(0, 10) : '',
      is_active: c.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showToast('Coupon code is required', 'error', 'error');
      return;
    }
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      showToast('Valid discount value is required', 'error', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        showToast(`Coupon "${editingCoupon.code}" updated`, 'check_circle');
      } else {
        await adminService.createCoupon(payload);
        showToast('New coupon created successfully', 'check_circle');
      }

      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Save failed', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await adminService.updateCoupon(c.id, { is_active: !c.is_active });
      showToast(`Coupon ${c.code} ${!c.is_active ? 'activated' : 'deactivated'}`, 'check_circle');
      fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!deletingCoupon) return;
    try {
      await adminService.deactivateCoupon(deletingCoupon.id);
      showToast(`Coupon "${deletingCoupon.code}" deactivated`, 'check_circle');
      setDeletingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Deactivation failed', 'error', 'error');
    }
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + Number(c.redemption_count || 0), 0);

  return (
    <div className="animate-in fade-in duration-500">
      <ConfirmModal
        open={!!deletingCoupon}
        title="Deactivate coupon?"
        message={deletingCoupon ? `Coupon "${deletingCoupon.code}" will be marked inactive. Existing redemptions will be preserved.` : ''}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeactivate}
        onCancel={() => setDeletingCoupon(null)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline text-3xl text-primary mb-1">Coupon Management</h2>
          <p className="text-stone-500 text-sm">Create and manage promotional discount codes and redemption limits.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create New Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Coupons', value: totalCoupons, color: 'text-primary', icon: 'local_offer' },
          { label: 'Active Codes', value: activeCoupons, color: 'text-green-600', icon: 'check_circle' },
          { label: 'Total Redemptions', value: totalRedemptions, color: 'text-tertiary', icon: 'shopping_cart_checkout' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-stone-100 shadow-sm flex items-center gap-4">
            <span className={`material-symbols-outlined text-[28px] ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">{s.label}</p>
              <p className={`font-headline text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-semibold text-sm text-stone-700">All Coupons</h3>
          <button onClick={fetchCoupons} className="text-stone-400 hover:text-primary transition-colors" title="Refresh">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Code', 'Discount', 'Min Order', 'Usage', 'Validity Window', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-4 text-[10px] font-label uppercase tracking-widest text-stone-400 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-stone-400 text-sm">
                    No coupons created yet. Click "Create New Coupon" to get started.
                  </td>
                </tr>
              ) : (
                coupons.map(c => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4 font-mono font-bold text-sm text-primary">
                        {c.code}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4 text-xs font-semibold">
                        {c.discount_type === 'percentage'
                          ? `${c.discount_value}% OFF`
                          : `${Number(c.discount_value).toLocaleString('fr-CM')} XAF OFF`}
                      </td>

                      {/* Min Order */}
                      <td className="px-5 py-4 text-xs text-stone-600">
                        {c.min_order_amount
                          ? `${Number(c.min_order_amount).toLocaleString('fr-CM')} XAF`
                          : <span className="text-stone-300">None</span>}
                      </td>

                      {/* Usage */}
                      <td className="px-5 py-4 text-xs">
                        <span className="font-semibold text-stone-800">{c.redemption_count}</span>
                        <span className="text-stone-400"> / {c.max_uses ?? '∞'}</span>
                      </td>

                      {/* Validity Window */}
                      <td className="px-5 py-4 text-xs text-stone-500">
                        {c.expires_at ? (
                          <span className={isExpired ? 'text-red-500 font-semibold' : ''}>
                            {isExpired ? 'Expired: ' : 'Until '}{new Date(c.expires_at).toLocaleDateString('fr-CM')}
                          </span>
                        ) : (
                          <span className="text-stone-300">Always valid</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-colors ${
                            c.is_active && !isExpired
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          }`}
                        >
                          {c.is_active ? (isExpired ? 'Expired' : 'Active') : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {c.is_active && (
                            <button
                              onClick={() => setDeletingCoupon(c)}
                              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <span className="material-symbols-outlined text-[18px]">block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-stone-100">
              <h3 className="font-headline text-xl text-primary font-bold">
                {editingCoupon ? `Edit Coupon "${editingCoupon.code}"` : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Coupon Code</label>
                <input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. GLOW15"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 font-mono text-sm font-bold uppercase outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm({ ...form, discount_type: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary transition-colors"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (XAF)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    value={form.discount_value}
                    onChange={e => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === 'percentage' ? '15' : '2000'}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Min Cart Total (XAF)</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                    placeholder="Optional (e.g. 10000)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Global Max Uses</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Uses Per User</label>
                  <input
                    type="number"
                    value={form.max_uses_per_user}
                    onChange={e => setForm({ ...form, max_uses_per_user: e.target.value })}
                    placeholder="1"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Starts At</label>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={e => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[10px]">Expires At</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="is_active" className="font-semibold text-stone-700 text-xs cursor-pointer">
                  Active (code can be redeemed immediately)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 rounded-xl font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
