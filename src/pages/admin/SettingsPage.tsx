import React, { useState, useEffect } from 'react';
import { showToast } from '../../components/ToastContainer';
import api from '../../services/api';

interface Setting {
  value: any;
  description: string;
  updated_at: string;
}

interface ShippingRate {
  id: number;
  region_name: string;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgencyCoverage {
  town_name: string;
  destination_office_location: string;
  is_verified: boolean;
}

interface Agency {
  id: number;
  name: string;
  origin_location: string;
  contact_phone: string;
  is_active: boolean;
  is_verified: boolean;
  coverage?: AgencyCoverage[];
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tax rate form state
  const [taxRate, setTaxRate] = useState<string>('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<string>('');
  const [freeShippingEnabled, setFreeShippingEnabled] = useState<boolean>(false);

  // Shipping rate form state
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRate, setNewRate] = useState<string>('');
  const [newIsActive, setNewIsActive] = useState(true);

  // Agency form state
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newOriginLocation, setNewOriginLocation] = useState('Mile 17 Junction, Buea');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newAgencyVerified, setNewAgencyVerified] = useState(true);

  // Coverage modal / form
  const [coverageAgencyId, setCoverageAgencyId] = useState<number | null>(null);
  const [coverageTown, setCoverageTown] = useState('');
  const [coverageOffice, setCoverageOffice] = useState('');

  useEffect(() => {
    loadSettings();
    loadShippingRates();
    loadAgencies();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data);

      const taxSetting = response.data.tax_rate;
      if (taxSetting && taxSetting.value !== undefined && taxSetting.value !== null) {
        const val = typeof taxSetting.value === 'object' ? taxSetting.value.rate : taxSetting.value;
        setTaxRate(val !== undefined && val !== null ? String(val) : '');
      }

      const freeShippingSetting = response.data.free_shipping_threshold;
      if (freeShippingSetting) {
        setFreeShippingThreshold(String(freeShippingSetting.value.amount || ''));
        setFreeShippingEnabled(freeShippingSetting.value.enabled || false);
      }
    } catch (error) {
      showToast('Failed to load settings', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadShippingRates = async () => {
    try {
      const response = await api.get('/admin/shipping-rates');
      const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setShippingRates(list);
    } catch (error) {
      showToast('Failed to load shipping rates', 'error', 'error');
    }
  };

  const loadAgencies = async () => {
    try {
      const response = await api.get('/admin/agencies');
      const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setAgencies(list);
    } catch (error) {
      showToast('Failed to load transport agencies', 'error', 'error');
    }
  };

  const saveTaxRate = async () => {
    setSaving(true);
    try {
      const rateValue = parseFloat(taxRate);
      if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
        showToast('Please enter a valid tax rate (0-100)', 'error', 'error');
        return;
      }

      await api.put('/admin/settings/tax_rate', {
        value: { rate: rateValue, description: 'Cameroon standard VAT rate as percentage' },
        description: 'Tax rate percentage applied to subtotal',
      });

      showToast('Tax rate updated successfully', 'check_circle', 'success');
      loadSettings();
    } catch (error) {
      showToast('Failed to update tax rate', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveFreeShippingThreshold = async () => {
    setSaving(true);
    try {
      const amount = parseFloat(freeShippingThreshold);
      if (isNaN(amount) || amount < 0) {
        showToast('Please enter a valid amount', 'error', 'error');
        return;
      }

      await api.put('/admin/settings/free_shipping_threshold', {
        value: { amount, enabled: freeShippingEnabled },
        description: 'Order subtotal above which shipping is free (in XAF)',
      });

      showToast('Free shipping threshold updated successfully', 'check_circle', 'success');
      loadSettings();
    } catch (error) {
      showToast('Failed to update free shipping threshold', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveShippingRate = async () => {
    if (!editingRate) return;

    setSaving(true);
    try {
      await api.put(`/admin/shipping-rates/${editingRate.id}`, {
        rate: editingRate.rate,
        is_active: editingRate.is_active,
        region_name: editingRate.region_name,
      });

      showToast('Shipping rate updated successfully', 'check_circle', 'success');
      setEditingRate(null);
      loadShippingRates();
    } catch (error) {
      showToast('Failed to update shipping rate', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createShippingRate = async () => {
    if (!newRegionName.trim() || !newRate) {
      showToast('Please fill in all fields', 'error', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/shipping-rates', {
        region_name: newRegionName.trim(),
        rate: parseFloat(newRate),
        is_active: newIsActive,
      });

      showToast('Shipping rate created successfully', 'check_circle', 'success');
      setNewRegionName('');
      setNewRate('');
      setNewIsActive(true);
      loadShippingRates();
    } catch (error) {
      showToast('Failed to create shipping rate', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createAgency = async () => {
    if (!newAgencyName.trim()) {
      showToast('Agency name is required', 'error', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/agencies', {
        name: newAgencyName.trim(),
        origin_location: newOriginLocation.trim() || 'Mile 17 Junction, Buea',
        contact_phone: newContactPhone.trim(),
        is_active: true,
        is_verified: newAgencyVerified,
      });

      showToast('Transport agency registered!', 'check_circle', 'success');
      setNewAgencyName('');
      setNewContactPhone('');
      loadAgencies();
    } catch (error) {
      showToast('Failed to create agency', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCoverage = async () => {
    if (!coverageAgencyId || !coverageTown.trim() || !coverageOffice.trim()) {
      showToast('Town name and destination office location are required', 'error', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/admin/agencies/${coverageAgencyId}/coverage`, {
        town_name: coverageTown.trim(),
        destination_office_location: coverageOffice.trim(),
        is_verified: true,
      });

      showToast('Town coverage assigned to agency!', 'check_circle', 'success');
      setCoverageAgencyId(null);
      setCoverageTown('');
      setCoverageOffice('');
      loadAgencies();
    } catch (error) {
      showToast('Failed to add coverage', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface mb-12">
          Settings & Logistics Management
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Tax Rate Settings */}
          <div className="bg-surface-container-low rounded-2xl p-8">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              Tax Configuration
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  placeholder="19.25"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-3 px-0 focus:border-tertiary transition-colors placeholder:text-on-surface/20 text-on-surface"
                />
                <p className="text-xs text-on-surface-variant mt-2">
                  Standard VAT rate applied to subtotal (after discount, before shipping)
                </p>
              </div>
              <button
                onClick={saveTaxRate}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {saving ? 'Saving...' : 'Save Tax Rate'}
              </button>
            </div>
          </div>

          {/* Free Shipping Threshold */}
          <div className="bg-surface-container-low rounded-2xl p-8">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              Free Shipping Threshold
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Threshold Amount (XAF)
                </label>
                <input
                  type="number"
                  value={freeShippingThreshold}
                  onChange={e => setFreeShippingThreshold(e.target.value)}
                  placeholder="50000"
                  step="1000"
                  min="0"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-3 px-0 focus:border-tertiary transition-colors placeholder:text-on-surface/20 text-on-surface"
                />
                <p className="text-xs text-on-surface-variant mt-2">
                  Orders above this amount get free shipping
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="freeShippingEnabled"
                  checked={freeShippingEnabled}
                  onChange={e => setFreeShippingEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-outline/30 text-primary focus:ring-primary"
                />
                <label htmlFor="freeShippingEnabled" className="text-sm text-on-surface">
                  Enable free shipping threshold
                </label>
              </div>
              <button
                onClick={saveFreeShippingThreshold}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {saving ? 'Saving...' : 'Save Free Shipping Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Transport Agencies Management Section */}
        <div className="bg-surface-container-low rounded-2xl p-8 mb-12">
          <h2 className="font-headline text-2xl text-on-surface mb-2">
            Inter-City Transport Agencies (Ground Parcel Delivery)
          </h2>
          <p className="text-xs text-on-surface-variant mb-6">
            Parcels depart from Buea (Mile 17 Park) to other major cities in Cameroon.
          </p>

          <div className="space-y-6 mb-8">
            {Array.isArray(agencies) && agencies.map(agency => (
              <div key={agency.id} className="p-6 bg-surface-container-lowest rounded-xl border border-outline/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">directions_bus</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{agency.name}</h3>
                        {agency.is_verified && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Departure: <strong>{agency.origin_location}</strong> · Phone: {agency.contact_phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCoverageAgencyId(agency.id);
                      setCoverageTown('');
                      setCoverageOffice('');
                    }}
                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add_location_alt</span>
                    Add Town Route
                  </button>
                </div>

                {/* Town Coverage Details */}
                <div className="pt-3 border-t border-outline/10">
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Destinations Covered:</p>
                  {(!agency.coverage || agency.coverage.length === 0) ? (
                    <p className="text-xs text-on-surface-variant italic">No town coverage assigned yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {agency.coverage.map((c, i) => (
                        <div key={i} className="p-3 bg-surface-container-low rounded-lg text-xs">
                          <p className="font-bold text-primary">{c.town_name}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">Office: {c.destination_office_location || 'Main Park'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Agency Form */}
          <div className="p-6 bg-surface-container-high rounded-xl">
            <h3 className="font-headline text-lg text-on-surface mb-4">
              Register New Transport Agency
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Agency Name *
                </label>
                <input
                  type="text"
                  value={newAgencyName}
                  onChange={e => setNewAgencyName(e.target.value)}
                  placeholder="e.g. Vatican Express"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Buea Origin Park
                </label>
                <input
                  type="text"
                  value={newOriginLocation}
                  onChange={e => setNewOriginLocation(e.target.value)}
                  placeholder="Mile 17 Junction, Buea"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  placeholder="+237 670 000 000"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors text-on-surface"
                />
              </div>
            </div>
            <button
              onClick={createAgency}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-lg disabled:opacity-60"
            >
              {saving ? 'Registering...' : 'Register Agency'}
            </button>
          </div>
        </div>

        {/* Coverage Modal */}
        {coverageAgencyId !== null && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCoverageAgencyId(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
              <h3 className="font-headline text-xl">Add Town Coverage for Agency</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-1 font-semibold">Destination Town *</label>
                  <input
                    type="text"
                    value={coverageTown}
                    onChange={e => setCoverageTown(e.target.value)}
                    placeholder="e.g. Douala, Yaoundé, Bamenda"
                    className="w-full bg-transparent outline-none border-b border-outline/30 py-2 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-1 font-semibold">Destination Office Location *</label>
                  <input
                    type="text"
                    value={coverageOffice}
                    onChange={e => setCoverageOffice(e.target.value)}
                    placeholder="e.g. Akwa & Bonaberi offices, Douala"
                    className="w-full bg-transparent outline-none border-b border-outline/30 py-2 text-sm text-on-surface"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCoverageAgencyId(null)} className="flex-1 py-3 border border-stone-200 rounded-xl text-sm font-semibold hover:bg-stone-50">Cancel</button>
                <button onClick={saveCoverage} disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary/90">{saving ? 'Saving...' : 'Add Coverage'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Rates Section */}
        <div className="bg-surface-container-low rounded-2xl p-8">
          <h2 className="font-headline text-2xl text-on-surface mb-6">
            Town Flat Shipping Rates
          </h2>

          <div className="space-y-4 mb-8">
            {Array.isArray(shippingRates) && shippingRates.map(rate => (
              <div key={rate.id} className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl">
                <div>
                  <p className="font-semibold text-sm">{rate.region_name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {rate.rate.toLocaleString('fr-CM')} XAF • {rate.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingRate(rate)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>

          {editingRate && (
            <div className="p-6 bg-surface-container-high rounded-xl mb-8 space-y-4">
              <h3 className="font-headline text-lg text-on-surface">
                Edit {editingRate.region_name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                    Region Name
                  </label>
                  <input
                    type="text"
                    value={editingRate.region_name}
                    onChange={e => setEditingRate({ ...editingRate, region_name: e.target.value })}
                    className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                    Rate (XAF)
                  </label>
                  <input
                    type="number"
                    value={editingRate.rate}
                    onChange={e => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                    step="100"
                    min="0"
                    className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors text-on-surface"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingRate.is_active}
                    onChange={e => setEditingRate({ ...editingRate, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-outline/30 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm text-on-surface">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveShippingRate}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-lg disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingRate(null)}
                  className="px-6 py-3 border border-outline/30 text-on-surface rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="p-6 bg-surface-container-high rounded-xl">
            <h3 className="font-headline text-lg text-on-surface mb-4">
              Add New Shipping Town Rate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Town Name
                </label>
                <input
                  type="text"
                  value={newRegionName}
                  onChange={e => setNewRegionName(e.target.value)}
                  placeholder="e.g. Douala"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors placeholder:text-on-surface/20 text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 mb-2 font-semibold">
                  Rate (XAF)
                </label>
                <input
                  type="number"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  placeholder="2500"
                  step="100"
                  min="0"
                  className="w-full bg-transparent outline-none border-b border-outline/30 py-2 focus:border-tertiary transition-colors placeholder:text-on-surface/20 text-on-surface"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="newIsActive"
                  checked={newIsActive}
                  onChange={e => setNewIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-outline/30 text-primary focus:ring-primary"
                />
                <label htmlFor="newIsActive" className="text-sm text-on-surface">
                  Active
                </label>
              </div>
            </div>
            <button
              onClick={createShippingRate}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-lg disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Add Shipping Rate'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}