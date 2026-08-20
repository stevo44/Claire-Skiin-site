import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { showToast } from '../components/ToastContainer';
import { orderService } from '../services/orderService';
import { shippingService, ShippingTown, Agency, DEFAULT_TOWNS } from '../services/shippingService';
import { eventService } from '../services/eventService';
import { paymentService } from '../services/paymentService';
import { authService } from '../services/authService';
import { validateMoMoNumber, formatForFapshi } from '../lib/momoValidation';
import api from '../services/api';

type PaymentMethod = 'card' | 'mtn' | 'orange' | 'paypal';
type Step = 'shipping' | 'payment' | 'review';
type DeliveryMethod = 'local_delivery' | 'agency_shipping' | 'pickup';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'card',   label: 'Credit or Debit Card',       icon: 'credit_card'          },
  { id: 'mtn',    label: 'MTN Mobile Money',            icon: 'phone_android'         },
  { id: 'orange', label: 'Orange Money',                icon: 'phone_android'         },
  { id: 'paypal', label: 'PayPal',                      icon: 'account_balance_wallet'},
];

export default function CheckoutPage() {
  const navigate  = useNavigate();
  const { state, cartTotal, clearCart } = useCart();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step,       setStep]       = useState<Step>('shipping');
  const [payment,    setPayment]    = useState<PaymentMethod>('card');
  const [submitting, setSubmitting] = useState(false);

  // ── Shipping town list ───────────────────────────────────────────────────────
  // Never initialize with DEFAULT_TOWNS — that was the root cause of the
  // shipping-fee mismatch bug (customers could see a stale hardcoded price
  // that didn't match what the server would actually charge). Start empty
  // and show a loading state until the real API response arrives.
  const [availableTowns, setAvailableTowns] = useState<ShippingTown[]>([]);
  const [loadingTowns,   setLoadingTowns]   = useState(true);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);

  // ── Town Autocomplete / Selection State ─────────────────────────────────────
  const [townSearch,      setTownSearch]      = useState('Buea');
  const [showTownDropdown, setShowTownDropdown] = useState(false);
  const [selectedTownId,   setSelectedTownId]  = useState<number | ''>(1); // Default to Buea (id: 1)
  const [customTownName,   setCustomTownName]  = useState('');
  const townContainerRef                       = useRef<HTMLDivElement>(null);

  // ── Delivery method ─────────────────────────────────────────────────────────
  const [deliveryMethod,   setDeliveryMethod]   = useState<DeliveryMethod>('local_delivery');
  const [agencies,         setAgencies]         = useState<Agency[]>([]);
  const [loadingAgencies,  setLoadingAgencies]  = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);

  // ── Contact / address form ───────────────────────────────────────────────────
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [neighborhood,  setNeighborhood]  = useState('');

  // ── Validation errors ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Card fields ──────────────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv,    setCardCvv]    = useState('');

  // ── MoMo (Mobile Money) payment phone ────────────────────────────────────────
  // Separate from the shipping phone — pre-filled from it but fully editable.
  // Tracked with a ref so the sync effect knows when the user has manually
  // overridden the pre-fill and should stop auto-syncing.
  const [momoNumber, setMomoNumber] = useState('');
  const [momoError,  setMomoError]  = useState('');
  const momoManuallyEdited = useRef(false);

  // ── Promo ────────────────────────────────────────────────────────────────────
  const [promoCode,    setPromoCode]    = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // ── Financial config from server ─────────────────────────────────────────────
  const [taxRate,      setTaxRate]      = useState(0);
  const [freeShipping, setFreeShipping] = useState<{ enabled: boolean; amount: number }>({ enabled: false, amount: 0 });

  // ── Derived values ───────────────────────────────────────────────────────────
  const matchedTown = availableTowns.find(t => t.id === selectedTownId);
  const activeTownName = customTownName || matchedTown?.region_name || townSearch || 'Buea';
  const isBuea = activeTownName.trim().toLowerCase() === 'buea';

  const baseShipping = deliveryMethod === 'pickup' ? 0 : (matchedTown?.rate ?? 3000);
  const effectiveShipping =
    deliveryMethod === 'pickup' ? 0
    : freeShipping.enabled && (cartTotal - (promoApplied ? Math.floor(cartTotal * 0.15) : 0)) >= freeShipping.amount ? 0
    : baseShipping;

  const discount   = promoApplied ? Math.floor(cartTotal * 0.15) : 0;
  const subtotal   = cartTotal - discount;
  const taxAmount  = subtotal * (taxRate / 100);
  const finalTotal = subtotal + effectiveShipping + taxAmount;

  // ── Load towns on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const towns = await shippingService.getAvailableTowns();
        const safe = Array.isArray(towns) && towns.length > 0 ? towns : DEFAULT_TOWNS;
        if (!Array.isArray(towns) || towns.length === 0) {
          // Live API returned nothing usable — falling back, but the user
          // must be told these are estimates, not confirmed live rates.
          setUsingFallbackRates(true);
        }
        setAvailableTowns(safe);

        const bueaTown = safe.find(t => t.region_name.toLowerCase() === 'buea');
        if (bueaTown) {
          setSelectedTownId(bueaTown.id);
          setTownSearch(bueaTown.region_name);
          setDeliveryMethod('local_delivery');
        } else {
          setSelectedTownId(safe[0].id);
          setTownSearch(safe[0].region_name);
          setDeliveryMethod(safe[0].delivery_method);
        }
      } catch {
        // Network/API failure — fall back, but visibly, not silently.
        setUsingFallbackRates(true);
        setAvailableTowns(DEFAULT_TOWNS);
        setSelectedTownId(1);
        setTownSearch('Buea');
        setDeliveryMethod('local_delivery');
      } finally {
        setLoadingTowns(false);
      }
    })();
  }, []);

  // ── Close dropdown when clicking outside ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (townContainerRef.current && !townContainerRef.current.contains(e.target as Node)) {
        setShowTownDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load tax/free-shipping config once ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/orders/tax-rate');
        if (res.data.taxRate !== undefined) setTaxRate(res.data.taxRate);
        if (res.data.freeShipping)          setFreeShipping(res.data.freeShipping);
      } catch { /* use defaults */ }
    })();
  }, []);

  // ── Load saved momo_number from profile ──────────────────────────────────────
  // Returning customers shouldn't have to re-enter their MoMo number.
  useEffect(() => {
    const user = authService.getUser();
    if (user?.momo_number) {
      setMomoNumber(user.momo_number);
      momoManuallyEdited.current = true; // stop auto-sync with shipping phone
    }
  }, []);

  // ── Sync MoMo field with shipping phone (unless manually edited) ─────────────
  // Pre-fills the payment phone from the shipping contact phone as the user
  // types, so they don't have to re-enter the same number. Once they
  // manually edit the MoMo field, the sync stops.
  useEffect(() => {
    if (!momoManuallyEdited.current) {
      setMomoNumber(phone);
    }
  }, [phone]);

  // ── Select a town from autocomplete/dropdown ────────────────────────────────
  const handleSelectTown = async (town: ShippingTown) => {
    setSelectedTownId(town.id);
    setTownSearch(town.region_name);
    setCustomTownName('');
    setShowTownDropdown(false);
    setSelectedAgencyId(null);
    setErrors(er => ({ ...er, town: '' }));

    const isTownBuea = town.region_name.trim().toLowerCase() === 'buea';
    if (isTownBuea) {
      setDeliveryMethod('local_delivery');
      setAgencies([]);
    } else {
      setDeliveryMethod('agency_shipping');
      await fetchAgencies(town.region_name);
    }
  };

  // ── Handle custom typed town name ───────────────────────────────────────────
  const handleCustomTownInput = (val: string) => {
    setTownSearch(val);
    setShowTownDropdown(true);

    const match = availableTowns.find(t => t.region_name.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setSelectedTownId(match.id);
      setCustomTownName('');
      const isTownBuea = match.region_name.trim().toLowerCase() === 'buea';
      if (isTownBuea) {
        setDeliveryMethod('local_delivery');
      } else {
        setDeliveryMethod('agency_shipping');
        fetchAgencies(match.region_name);
      }
    } else {
      setSelectedTownId('');
      setCustomTownName(val);
      const isTownBuea = val.trim().toLowerCase() === 'buea';
      if (isTownBuea) {
        setDeliveryMethod('local_delivery');
      } else {
        setDeliveryMethod('agency_shipping');
        fetchAgencies(val);
      }
    }
  };

  const fetchAgencies = async (townName: string) => {
    try {
      setLoadingAgencies(true);
      const list = await shippingService.getAgenciesForTown(townName);
      const safe = Array.isArray(list) ? list : [];
      setAgencies(safe);
      if (safe.length > 0) setSelectedAgencyId(safe[0].id);
    } catch {
      setAgencies([]);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === 'agency_shipping' && agencies.length === 0) {
      fetchAgencies(activeTownName);
    }
    // Track delivery method selection at checkout
    eventService.trackDeliveryMethodSelected(method,
      method === 'agency_shipping' && selectedAgencyId ? { agency_id: selectedAgencyId } : {}
    );
  };

  // ── MoMo number change — mark as manually edited, validate real-time ────────
  const handleMomoNumberChange = (value: string) => {
    momoManuallyEdited.current = true;
    setMomoNumber(value);
    if (payment === 'mtn' || payment === 'orange') {
      const result = validateMoMoNumber(value, payment);
      setMomoError(result.valid ? '' : (result.message || ''));
    } else {
      setMomoError('');
    }
  };

  // ── Payment method change — re-validate MoMo number against new provider ─────
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPayment(method);
    if (method === 'mtn' || method === 'orange') {
      const result = validateMoMoNumber(momoNumber, method);
      setMomoError(result.valid ? '' : (result.message || ''));
    } else {
      setMomoError('');
    }
  };

  // ── Filter matching towns for dropdown suggestion ───────────────────────────
  const filteredTowns = availableTowns.filter(t =>
    t.region_name.toLowerCase().includes(townSearch.toLowerCase())
  );

  // ── Track checkout start (fire once on mount when cart has items) ───────────
  useEffect(() => {
    if (state.cart.length > 0) {
      eventService.trackCheckoutStarted({
        cart_count: state.cart.length,
        cart_total: cartTotal,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateShipping = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim())  e.fullName = 'Full name is required';
    if (!phone.trim())     e.phone    = 'Phone number is required';
    if (!email.trim())     e.email    = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    if (!townSearch.trim()) e.town    = 'Please select or type your destination town';

    if (deliveryMethod === 'local_delivery') {
      if (!streetAddress.trim()) e.streetAddress = 'Street address is required for door-to-door delivery';
    }
    if (deliveryMethod === 'agency_shipping' && agencies.length > 0 && !selectedAgencyId) {
      e.agency = 'Please select a transport agency';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleShippingNext = () => { if (validateShipping()) setStep('payment'); };

  // ── Order submission ─────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

      const shippingAddressObj = {
        fullName,
        phone,
        email,
        town:   activeTownName,
        street: deliveryMethod === 'local_delivery'
          ? streetAddress
          : deliveryMethod === 'agency_shipping'
            ? `Motor Park Shipping (${selectedAgency?.name ?? 'Agency'})`
            : 'In-Person Pickup at Spa',
        neighborhood,
        deliveryMethod,
        agencyName:        selectedAgency?.name ?? null,
        destinationOffice: selectedAgency?.destination_office_location ?? null,
      };

      const cartItemsPayload = state.cart.map(item => ({
        product_id: item.id,
        quantity:   item.qty,
      }));

      const orderRes = await orderService.createOrder(
        shippingAddressObj,
        payment,
        cartItemsPayload,
        promoApplied ? 'GLOW15' : undefined,
        deliveryMethod,
        deliveryMethod === 'agency_shipping' ? selectedAgencyId : null
      );

      const createdOrder = orderRes.order ?? orderRes;
      // Track checkout completion (order confirmed)
      eventService.trackCheckoutCompleted({
        order_id: createdOrder.id,
        total: createdOrder.total_amount ?? finalTotal,
        payment_method: payment,
        delivery_method: deliveryMethod,
        item_count: state.cart.length,
      });
      clearCart();

      // ── Initiate MoMo payment with the DEDICATED phone field ───────────────
      // This is the critical wiring: the number from the MoMo input field
      // (not the shipping phone) is what reaches POST /api/payments/initiate,
      // which in turn sends it to Fapshi's /direct-pay endpoint. The medium
      // is set explicitly so the backend's prefix-based fallback detection
      // is never used.
      if ((payment === 'mtn' || payment === 'orange') && momoNumber) {
        try {
          await paymentService.initiatePayment({
            order_id: createdOrder.id,
            phone: formatForFapshi(momoNumber),
            medium: payment === 'mtn' ? 'mobile money' : 'orange money',
            email,
          });
        } catch (payErr: any) {
          console.error('MoMo payment initiation failed:', payErr);
          showToast(
            payErr?.response?.data?.message || 'Order created, but payment initiation failed. Please retry from your orders.',
            'error', 'error'
          );
        }

        // Persist the MoMo number to the user's profile so returning
        // customers don't have to re-enter it. Fire-and-forget — a
        // failure here must not block the order confirmation flow.
        if (authService.isAuthenticated()) {
          authService.updateProfile({ momo_number: momoNumber }).catch(err => {
            console.error('Failed to save MoMo number to profile:', err);
          });
        }
      }

      showToast('Order placed successfully!', 'check_circle', 'success');
      navigate('/order-confirmed', { state: { order: createdOrder } });
    } catch (err: any) {
      console.error('Order creation failed:', err);
      showToast(err?.response?.data?.message || 'Failed to place order. Please try again.', 'error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'GLOW15') {
      setPromoApplied(true);
      showToast('Promo code GLOW15 applied — 15% off!', 'local_offer', 'success');
      // Track successful coupon application at checkout
      eventService.trackCouponApplied('GLOW15');
    } else {
      showToast('Invalid promo code. Try GLOW15', 'error', 'error');
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (state.cart.length === 0 && step !== 'review') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-24 px-6 text-center bg-background">
        <span className="material-symbols-outlined text-[80px] text-outline-variant">shopping_bag</span>
        <h2 className="font-headline text-3xl">Your bag is empty</h2>
        <p className="text-on-surface-variant">Add some products before checking out.</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
        >
          Shop the Collection
        </button>
      </div>
    );
  }

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      <main className="pt-28 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface mb-8">Checkout</h1>

        {/* Step indicator (Matches Image 1 design) */}
        <div className="mb-10 space-y-6">
          <div className="flex items-center gap-3 sm:gap-6 max-w-xl">
            {/* Step 1: Shipping */}
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step === 'shipping'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                1
              </div>
              <span className={`text-sm font-semibold transition-colors ${
                step === 'shipping' ? 'text-emerald-800 font-bold' : 'text-on-surface/50'
              }`}>
                Shipping
              </span>
            </div>

            <div className="h-[1px] flex-1 bg-outline/20" />

            {/* Step 2: Payment */}
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step === 'payment'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : step === 'review'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'border border-outline/30 text-on-surface/40 bg-surface-container-low'
              }`}>
                2
              </div>
              <span className={`text-sm font-semibold transition-colors ${
                step === 'payment' ? 'text-emerald-800 font-bold' : 'text-on-surface/50'
              }`}>
                Payment
              </span>
            </div>

            <div className="h-[1px] flex-1 bg-outline/20" />

            {/* Step 3: Review */}
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step === 'review'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'border border-outline/30 text-on-surface/40 bg-surface-container-low'
              }`}>
                3
              </div>
              <span className={`text-sm font-semibold transition-colors ${
                step === 'review' ? 'text-emerald-800 font-bold' : 'text-on-surface/50'
              }`}>
                Review
              </span>
            </div>
          </div>

          {/* Secure Encrypted Checkout Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-surface-container-low/80 rounded-full border border-outline/10 text-[11px] font-bold tracking-widest text-emerald-800 uppercase shadow-xs">
            <span className="material-symbols-outlined text-[16px] text-emerald-700">lock</span>
            <span>SECURE ENCRYPTED CHECKOUT</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* ─── MAIN FORM ─── */}
          <div className="lg:col-span-7">

            {/* ══ STEP 1: Shipping ══════════════════════════════════════════════ */}
            {step === 'shipping' && (
              <section className="space-y-8">

                {/* Contact */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline/10 space-y-6">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-primary">1. Customer Contact</h3>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setErrors(er => ({ ...er, fullName: '' })); }}
                      placeholder="e.g. Marie Ngu"
                      className={`w-full bg-transparent outline-none border-b py-2 text-on-surface transition-colors ${errors.fullName ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`}
                    />
                    {errors.fullName && <p className="text-error text-[11px] mt-1">{errors.fullName}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: '' })); }}
                        placeholder="you@example.com"
                        className={`w-full bg-transparent outline-none border-b py-2 text-on-surface transition-colors ${errors.email ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`}
                      />
                      {errors.email && <p className="text-error text-[11px] mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">Phone (WhatsApp) *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setErrors(er => ({ ...er, phone: '' })); }}
                        placeholder="+237 6XX XXX XXX"
                        className={`w-full bg-transparent outline-none border-b py-2 text-on-surface transition-colors ${errors.phone ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`}
                      />
                      {errors.phone && <p className="text-error text-[11px] mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Destination Town Selection + Autocomplete */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline/10 space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-primary">2. Destination Town</h3>

                  {loadingTowns ? (
                    <div className="animate-pulse space-y-3" role="status" aria-label="Loading shipping rates">
                      <div className="h-4 bg-outline/10 rounded w-1/3" />
                      <div className="h-10 bg-outline/10 rounded-full w-full" />
                    </div>
                  ) : (
                    <>
                      {usingFallbackRates && (
                        <div className="bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs rounded-lg px-3 py-2">
                          Using estimated shipping rates — final cost will be confirmed at checkout.
                        </div>
                      )}
                      <div className="relative" ref={townContainerRef}>
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-2">
                          Destination Town in Cameroon *
                        </label>

                        {/* Quick Pill Selection Bar for Major Towns */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {availableTowns.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTown(t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            selectedTownId === t.id
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'bg-surface-container-low text-on-surface/70 hover:bg-primary/10 hover:text-primary border border-outline/15'
                          }`}
                        >
                          {t.region_name}
                          <span className="ml-1 text-[10px] opacity-80">
                            ({t.region_name.toLowerCase() === 'buea' ? 'Local' : `${t.rate.toLocaleString('fr-CM')} XAF`})
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Autocomplete Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={townSearch}
                        onChange={e => handleCustomTownInput(e.target.value)}
                        onFocus={() => setShowTownDropdown(true)}
                        placeholder="Type or search your town (e.g. Douala, Yaoundé, Buea, Bamenda)"
                        className={`w-full bg-surface-container-low border rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors ${errors.town ? 'border-error' : 'border-outline/20'}`}
                      />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-[20px]">
                        search
                      </span>
                    </div>

                    {/* Floating Suggestion Dropdown */}
                    {showTownDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-outline/15 max-h-56 overflow-y-auto z-50 divide-y divide-stone-100">
                        {filteredTowns.map(t => (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTown(t)}
                            className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <span className="font-bold text-sm text-on-surface">{t.region_name}</span>
                            <span className="text-xs font-semibold text-primary">
                              {t.region_name.toLowerCase() === 'buea' ? '1,500 XAF (Local Door-to-Door)' : `${t.rate.toLocaleString('fr-CM')} XAF (Agency Shipping)`}
                            </span>
                          </div>
                        ))}
                        {filteredTowns.length === 0 && townSearch.trim() && (
                          <div className="px-4 py-3 text-xs text-on-surface-variant">
                            Custom town: <strong className="text-primary">{townSearch}</strong> (Standard Agency Shipping rate apply)
                          </div>
                        )}
                      </div>
                    )}
                    {errors.town && <p className="text-error text-[11px] mt-1">{errors.town}</p>}

                    {/* Active Destination Indicator Badge */}
                    <div className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${isBuea ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {isBuea ? 'two_wheeler' : 'directions_bus'}
                      </span>
                      <div>
                        <p className="font-bold">
                          Destination: {activeTownName}
                          <span className="ml-2 font-normal text-xs opacity-90">
                            ({deliveryMethod === 'pickup' ? 'Free Spa Pickup' : isBuea ? '1,500 XAF Rider' : `${baseShipping.toLocaleString('fr-CM')} XAF Agency Shipping`})
                          </span>
                        </p>
                        <p className="text-xs opacity-80 mt-0.5">
                          {isBuea ? 'Physical local delivery via dedicated Buea rider' : `Parcel dispatch from Buea Mile 17 Motor Park to ${activeTownName}`}
                        </p>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>

                {/* Delivery Method */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline/10 space-y-6">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-primary">3. Delivery Method</h3>

                  <div className="grid grid-cols-1 gap-4">

                    {/* Local Door-to-Door — Buea only */}
                    {isBuea && (
                      <button
                        type="button"
                        onClick={() => handleDeliveryMethodChange('local_delivery')}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${deliveryMethod === 'local_delivery' ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline/20 hover:border-outline/50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'local_delivery' ? 'border-primary' : 'border-outline/40'}`}>
                              {deliveryMethod === 'local_delivery' && <div className="w-2 h-2 bg-primary rounded-full" />}
                            </div>
                            <span className="material-symbols-outlined text-primary text-[20px]">two_wheeler</span>
                            <div>
                              <p className="font-bold text-sm">Local Door-to-Door Rider</p>
                              <p className="text-xs text-on-surface-variant">Delivered directly to your address in Buea</p>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-primary shrink-0">1,500 XAF</span>
                        </div>
                      </button>
                    )}

                    {/* Agency Shipping — non-Buea towns */}
                    {!isBuea && (
                      <button
                        type="button"
                        onClick={() => handleDeliveryMethodChange('agency_shipping')}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${deliveryMethod === 'agency_shipping' ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline/20 hover:border-outline/50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'agency_shipping' ? 'border-primary' : 'border-outline/40'}`}>
                              {deliveryMethod === 'agency_shipping' && <div className="w-2 h-2 bg-primary rounded-full" />}
                            </div>
                            <span className="material-symbols-outlined text-primary text-[20px]">directions_bus</span>
                            <div>
                              <p className="font-bold text-sm">Motor Park Agency Shipping</p>
                              <p className="text-xs text-on-surface-variant">Dispatched from Mile 17, Buea to {activeTownName}</p>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-primary shrink-0">{baseShipping.toLocaleString('fr-CM')} XAF</span>
                        </div>
                      </button>
                    )}

                    {/* In-Person Pickup — always available */}
                    <button
                      type="button"
                      onClick={() => handleDeliveryMethodChange('pickup')}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${deliveryMethod === 'pickup' ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline/20 hover:border-outline/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'pickup' ? 'border-primary' : 'border-outline/40'}`}>
                            {deliveryMethod === 'pickup' && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                          <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                          <div>
                            <p className="font-bold text-sm">In-Person Spa Pickup</p>
                            <p className="text-xs text-on-surface-variant">Collect at Claire Skiin Sanctuary, Buea — no shipping cost</p>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-green-700 shrink-0">FREE</span>
                      </div>
                    </button>
                  </div>

                  {/* ─ Method-specific form sections ─ */}

                  {/* Case A: Buea local delivery — needs street address */}
                  {deliveryMethod === 'local_delivery' && (
                    <div className="pt-4 border-t border-outline/10 space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">
                          Street Address / Landmark *
                        </label>
                        <input
                          type="text"
                          value={streetAddress}
                          onChange={e => { setStreetAddress(e.target.value); setErrors(er => ({ ...er, streetAddress: '' })); }}
                          placeholder="e.g. Street 3, Molyko, opposite UB Junction"
                          className={`w-full bg-transparent outline-none border-b py-2 text-on-surface transition-colors ${errors.streetAddress ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`}
                        />
                        {errors.streetAddress && <p className="text-error text-[11px] mt-1">{errors.streetAddress}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">
                          Neighborhood / Quarter (Optional)
                        </label>
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={e => setNeighborhood(e.target.value)}
                          placeholder="e.g. Molyko, Bonduma, Checkpoint"
                          className="w-full bg-transparent outline-none border-b border-outline/30 py-2 text-on-surface focus:border-tertiary transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Case B: Agency shipping — select transport agency */}
                  {deliveryMethod === 'agency_shipping' && (
                    <div className="pt-4 border-t border-outline/10 space-y-3">
                      <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold">
                        Select Your Preferred Transport Agency *
                      </label>
                      <p className="text-[11px] text-on-surface/50">
                        All agencies below depart from Buea Mile 17 Motor Park. Choose the one that reaches {activeTownName} and that you trust.
                      </p>

                      {loadingAgencies ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : agencies.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          <p className="font-bold mb-1">No custom agency registered for {activeTownName} yet.</p>
                          <p>Our admin will arrange dispatch from Mile 17 Motor Park via a trusted ground carrier. Your parcel tracking details will be sent via WhatsApp.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {agencies.map(a => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => { setSelectedAgencyId(a.id); setErrors(er => ({ ...er, agency: '' })); }}
                              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedAgencyId === a.id ? 'border-primary bg-surface-container-lowest shadow-sm' : 'border-outline/15 bg-surface-container-low hover:bg-surface-container-lowest'}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm">{a.name}</span>
                                  {a.is_verified && a.coverage_verified ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800 font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[11px]">verified</span>
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                      Pending Verification
                                    </span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${selectedAgencyId === a.id ? 'border-primary bg-primary' : 'border-outline/40'}`}>
                                  {selectedAgencyId === a.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                              </div>
                              <div className="text-xs text-on-surface-variant space-y-1">
                                {a.origin_location
                                  ? <p>📍 <span className="font-semibold">Buea Departure:</span> {a.origin_location}</p>
                                  : <p className="text-stone-400 italic">📍 Buea office address not yet confirmed</p>}
                                {a.destination_office_location
                                  ? <p>🏬 <span className="font-semibold">{activeTownName} Collection:</span> {a.destination_office_location}</p>
                                  : <p className="text-stone-400 italic">🏬 Collection at main {activeTownName} park office</p>}
                                {a.contact_phone && <p>📞 {a.contact_phone}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.agency && <p className="text-error text-[11px] mt-1">{errors.agency}</p>}
                    </div>
                  )}

                  {/* Case C: Pickup */}
                  {deliveryMethod === 'pickup' && (
                    <div className="pt-4 border-t border-outline/10">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <p className="font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">spa</span>
                          In-Person Collection at Claire Skiin Sanctuary
                        </p>
                        <p>📍 Address: Main Boulevard, Buea (Opposite Spatula Complex)</p>
                        <p>⏰ Hours: Monday – Saturday, 9:00 AM – 6:00 PM</p>
                        <p className="text-emerald-700 font-semibold pt-1">
                          You will receive a WhatsApp message when your parcel is packaged and ready for pickup.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleShippingNext}
                  className="w-full py-5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20"
                >
                  Continue to Payment →
                </button>
              </section>
            )}

            {/* ══ STEP 2: Payment ══════════════════════════════════════════════ */}
            {step === 'payment' && (
              <section>
                <h2 className="font-headline text-2xl mb-10">Payment Method</h2>
                <div className="space-y-4">
                  {PAYMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePaymentMethodChange(opt.id)}
                      className={`w-full text-left p-5 rounded-xl border cursor-pointer transition-all ${payment === opt.id ? 'border-primary bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,108,12,0.1)]' : 'border-outline/15 bg-surface-container-low hover:bg-surface-container-lowest'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payment === opt.id ? 'border-primary' : 'border-outline/30'}`}>
                            {payment === opt.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                          </div>
                          <span className={`font-medium ${payment === opt.id ? 'text-on-surface' : 'text-on-surface/60'}`}>{opt.label}</span>
                        </div>
                        <span className="material-symbols-outlined text-on-surface/40">{opt.icon}</span>
                      </div>
                    </button>
                  ))}

                  {payment === 'card' && (
                    <div className="mt-4 p-6 rounded-xl bg-surface-container-lowest border border-outline/10 grid grid-cols-2 gap-8">
                      <div className="col-span-2 relative">
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 absolute -top-5 font-semibold">Card Number</label>
                        <input
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19))}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full bg-transparent outline-none border-b border-outline/30 py-3 focus:border-tertiary transition-colors placeholder:text-on-surface/20"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 absolute -top-5 font-semibold">Expiry Date</label>
                        <input
                          value={cardExpiry}
                          onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4); setCardExpiry(v); }}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full bg-transparent outline-none border-b border-outline/30 py-3 focus:border-tertiary transition-colors placeholder:text-on-surface/20"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 absolute -top-5 font-semibold">CVV</label>
                        <input
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="123"
                          maxLength={3}
                          type="password"
                          className="w-full bg-transparent outline-none border-b border-outline/30 py-3 focus:border-tertiary transition-colors placeholder:text-on-surface/20"
                        />
                      </div>
                    </div>
                  )}

                  {(payment === 'mtn' || payment === 'orange') && (
                    <div className="mt-4 p-6 rounded-xl bg-surface-container-lowest border border-outline/10 space-y-2">
                      <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold">
                        {payment === 'mtn' ? 'MTN' : 'Orange'} Mobile Money Number *
                      </label>
                      <p className="text-[11px] text-on-surface/50 -mt-1">
                        Pre-filled from your shipping phone — edit if your payment number differs.
                      </p>
                      <input
                        type="tel"
                        value={momoNumber}
                        onChange={e => handleMomoNumberChange(e.target.value)}
                        placeholder="+237 6XX XXX XXX"
                        className={`w-full bg-transparent outline-none border-b py-3 focus:border-tertiary transition-colors placeholder:text-on-surface/20 ${momoError ? 'border-error' : 'border-outline/30'}`}
                      />
                      {momoError && <p className="text-error text-[11px] mt-1">{momoError}</p>}
                      {payment === 'mtn' && (
                        <p className="text-[10px] text-on-surface/40 mt-1">Valid MTN prefixes: 67, 68, 650–654</p>
                      )}
                      {payment === 'orange' && (
                        <p className="text-[10px] text-on-surface/40 mt-1">Valid Orange prefixes: 69, 655–659</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-12">
                  <button
                    onClick={() => setStep('shipping')}
                    className="px-6 py-4 rounded-xl border border-outline/30 text-sm font-semibold hover:bg-surface-container-low transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      // Validate MoMo number before proceeding to review
                      if (payment === 'mtn' || payment === 'orange') {
                        const result = validateMoMoNumber(momoNumber, payment);
                        if (!result.valid) {
                          setMomoError(result.message || '');
                          return;
                        }
                      }
                      setStep('review');
                    }}
                    disabled={(payment === 'mtn' || payment === 'orange') && (!momoNumber || !!momoError)}
                    className="flex-1 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    Review Order →
                  </button>
                </div>
              </section>
            )}

            {/* ══ STEP 3: Review ════════════════════════════════════════════════ */}
            {step === 'review' && (
              <section>
                <h2 className="font-headline text-2xl mb-8">Review Your Order</h2>

                <div className="space-y-4 mb-8">
                  {/* Shipping summary */}
                  <div className="p-5 rounded-xl bg-surface-container-low">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Fulfillment & Delivery</p>
                        <p className="font-semibold">{fullName}</p>
                        <p className="text-sm font-medium text-primary mt-0.5">
                          {deliveryMethod === 'local_delivery'   && 'Door-to-Door Rider (Buea)'}
                          {deliveryMethod === 'agency_shipping'  && `Motor Park Agency Shipping to ${activeTownName} via ${selectedAgency?.name || 'Selected Agency'}`}
                          {deliveryMethod === 'pickup'           && 'In-Person Spa Pickup (Buea Sanctuary)'}
                        </p>
                        {deliveryMethod === 'local_delivery' && (
                          <p className="text-sm text-on-surface-variant mt-1">{streetAddress}{neighborhood ? `, ${neighborhood}` : ''}, Buea</p>
                        )}
                        {deliveryMethod === 'agency_shipping' && selectedAgency?.destination_office_location && (
                          <p className="text-sm text-on-surface-variant mt-1">Collection: {selectedAgency.destination_office_location}</p>
                        )}
                        <p className="text-sm text-on-surface-variant">{phone} · {email}</p>
                      </div>
                      <button onClick={() => setStep('shipping')} className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity ml-4 shrink-0">
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Payment summary */}
                  <div className="p-5 rounded-xl bg-surface-container-low">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Payment Method</p>
                        <p className="font-semibold text-sm">{PAYMENT_OPTIONS.find(p => p.id === payment)?.label}</p>
                        {(payment === 'mtn' || payment === 'orange') && momoNumber && (
                          <p className="text-xs text-on-surface-variant mt-1">MoMo: {momoNumber}</p>
                        )}
                      </div>
                      <button onClick={() => setStep('payment')} className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('payment')}
                    className="px-6 py-4 rounded-xl border border-outline/30 text-sm font-semibold hover:bg-surface-container-low transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    className="flex-1 py-5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20 disabled:opacity-60 disabled:scale-100"
                  >
                    {submitting
                      ? 'Placing Order…'
                      : `Pay & Place Order — ${finalTotal.toLocaleString('fr-CM')} XAF`}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* ─── ORDER SUMMARY SIDEBAR ─── */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline/10 sticky top-28 space-y-6">
              <h3 className="font-headline text-xl text-on-surface">Order Summary</h3>

              {/* Destination pill */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-primary">place</span>
                <span>Shipping to: <strong className="text-on-surface">{activeTownName}</strong></span>
              </div>

              {/* Cart items */}
              <div className="space-y-5 max-h-64 overflow-y-auto pr-1">
                {state.cart.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-surface-container-high shrink-0">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-semibold text-sm leading-tight truncate">{item.name}</h4>
                      <p className="text-xs text-on-surface/50 uppercase tracking-widest mt-1">Qty: {item.qty}</p>
                      <p className="text-sm font-bold text-primary mt-1">{(item.price * item.qty).toLocaleString('fr-CM')} XAF</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <div className="relative pt-2">
                <label className="block text-[10px] uppercase tracking-widest text-on-surface/50 font-semibold mb-1">Promo Code</label>
                <div className="relative">
                  <input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    placeholder="Try GLOW15 for 15% off"
                    disabled={promoApplied}
                    className="w-full bg-transparent outline-none border-b border-outline/30 py-2 text-sm placeholder:text-on-surface/20 focus:border-tertiary transition-colors disabled:opacity-50 pr-16"
                  />
                  {!promoApplied
                    ? <button onClick={applyPromo} className="absolute right-0 bottom-2 text-primary text-[10px] font-bold uppercase tracking-widest hover:text-tertiary transition-colors">Apply</button>
                    : <span className="absolute right-0 bottom-2 text-[10px] font-bold uppercase tracking-widest text-green-600">✓ Applied</span>}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-outline/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface/60">Subtotal</span>
                  <span>{cartTotal.toLocaleString('fr-CM')} XAF</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Promo GLOW15 (−15%)</span>
                    <span>−{discount.toLocaleString('fr-CM')} XAF</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface/60">Shipping</span>
                  <span className="font-semibold text-primary">
                    {deliveryMethod === 'pickup'
                      ? 'Free (Pickup)'
                      : effectiveShipping === 0 && freeShipping.enabled
                        ? 'Free (qualifies)'
                        : `${effectiveShipping.toLocaleString('fr-CM')} XAF`}
                  </span>
                </div>
                {taxRate > 0 && taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface/60">Tax (VAT {taxRate}%)</span>
                    <span className="font-semibold text-primary">{taxAmount.toLocaleString('fr-CM')} XAF</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-headline pt-4 border-t border-outline/10">
                  <span>Total</span>
                  <span className="text-tertiary">{finalTotal.toLocaleString('fr-CM')} XAF</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Ethical Sourcing Banner & Trust Icons (Placed right before the footer) */}
        <div className="mt-20 pt-10 border-t border-outline/10 text-center space-y-4 max-w-3xl mx-auto">
          <p className="text-xs text-on-surface/50 uppercase tracking-[0.2em] font-medium leading-relaxed px-4">
            ALL PRODUCTS ARE ETHICALLY SOURCED AND ROOTED IN TRADITIONAL CAMEROONIAN BOTANICAL WISDOM.
          </p>
          <div className="flex justify-center items-center gap-10 text-on-surface/35 pt-1">
            <span className="material-symbols-outlined text-2xl" title="Ethically Sourced">verified_user</span>
            <span className="material-symbols-outlined text-2xl" title="Botanical Wisdom">potted_plant</span>
            <span className="material-symbols-outlined text-2xl" title="100% Pure & Natural">eco</span>
          </div>
        </div>
      </main>
    </div>
  );
}
