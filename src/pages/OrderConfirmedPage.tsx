import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { orderService } from '../services/orderService';

interface OrderState {
  orderId?: string | number;
  id?: string | number;
  items?: Array<{ id?: number; product_id?: number; name: string; img?: string; image_url?: string; qty?: number; quantity?: number; price: number }>;
  total?: number;
  total_amount?: number;
  payment?: string;
  payment_method?: string;
  shipping?: { fullName?: string; address?: string; city?: string; phone?: string; email?: string };
  shipping_address?: any;
  shippingAddress?: any;
  shippingCost?: number;
  tax?: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  mtn: 'MTN Mobile Money',
  orange: 'Orange Money',
  card: 'Credit / Debit Card',
  paypal: 'PayPal',
  fapshi: 'Mobile Money (Fapshi)',
};

export default function OrderConfirmedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const queryOrderId = searchParams.get('orderId');
  // CheckoutPage navigates with `{ state: { order: createdOrder } }` — the
  // order is nested under an `order` key. Handle that shape, while staying
  // backward-compatible with a flat order object if ever passed directly.
  const rawState = location.state as { order?: OrderState } | OrderState | null;
  const initialOrderState: OrderState | null =
    rawState && typeof rawState === 'object' && 'order' in rawState && rawState.order
      ? rawState.order
      : (rawState as OrderState | null);

  const [order, setOrder] = useState<OrderState | null>(initialOrderState);
  const [loading, setLoading] = useState<boolean>(!initialOrderState && Boolean(queryOrderId));

  useEffect(() => {
    // If state was provided, use it directly
    if (initialOrderState) {
      setOrder(initialOrderState);
      return;
    }

    // If redirected with orderId query param (e.g. from payment gateway), fetch from API
    if (queryOrderId) {
      setLoading(true);
      orderService
        .getOrderById(queryOrderId)
        .then(fetchedOrder => {
          setOrder(fetchedOrder);
        })
        .catch(err => {
          console.error('Failed to fetch order details for confirmation:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialOrderState, queryOrderId]);

  // If no order data and not loading, send them home
  useEffect(() => {
    if (!loading && !order && !queryOrderId) {
      navigate('/', { replace: true });
    }
  }, [loading, order, queryOrderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-2 border-stone-200 border-t-primary rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Retrieving order details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Normalize order ID display
  const rawId = order.orderId || order.id || queryOrderId || '';
  const displayOrderId = String(rawId).startsWith('CS-') ? String(rawId) : `CS-${rawId}`;

  // Normalize shipping address
  let rawShipping = order.shipping || order.shipping_address || order.shippingAddress;
  if (typeof rawShipping === 'string') {
    try {
      rawShipping = JSON.parse(rawShipping);
    } catch {
      rawShipping = {};
    }
  }
  const shippingObj = rawShipping && typeof rawShipping === 'object' ? rawShipping : {};

  const fullName =
    shippingObj.fullName ||
    shippingObj.full_name ||
    shippingObj.name ||
    'Valued Customer';
  
  const firstName = fullName.trim() ? fullName.trim().split(' ')[0] : 'Valued Customer';

  const address = shippingObj.address || shippingObj.street || 'Address provided on order';
  const city = shippingObj.city || 'Cameroon';
  const phone = shippingObj.phone || shippingObj.phoneNumber || '';
  const email = shippingObj.email || '';

  // Normalize total amount
  const totalPaid = Number(order.total ?? order.total_amount ?? 0);

  // Normalize items
  const items = Array.isArray(order.items) ? order.items : [];

  // Normalize payment method label
  const paymentKey = order.payment || order.payment_method || 'Mobile Money';
  const paymentLabel = PAYMENT_LABELS[paymentKey.toLowerCase()] || paymentKey;

  return (
    <div className="min-h-screen bg-surface pt-28 pb-24 px-6 md:px-12">
      <div className="max-w-2xl mx-auto">

        {/* Success header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-tertiary font-bold mb-3">Order Confirmed</p>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface mb-4">
            Thank you, {firstName}.
          </h1>
          <p className="text-on-surface-variant text-base max-w-md mx-auto leading-relaxed">
            Your order has been received and is being prepared with care. You'll receive a confirmation shortly.
          </p>
        </div>

        {/* Order reference card */}
        <div className="bg-surface-container-low rounded-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-outline-variant/20">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Order Reference</p>
              <p className="font-headline text-2xl text-primary">#{displayOrderId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Total Paid</p>
              <p className="font-headline text-2xl text-on-surface">{totalPaid.toLocaleString('fr-CM')} XAF</p>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-4 mb-6 pb-6 border-b border-outline-variant/20">
              {items.map((item: any, idx: number) => {
                const itemQty = Number(item.qty || item.quantity || 1);
                const itemPrice = Number(item.price || 0);
                const itemImg = item.img || item.image_url || '/placeholder.jpg';
                return (
                  <div key={item.id || idx} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant shrink-0">
                      <img loading="lazy" src={itemImg} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-on-surface-variant">Qty: {itemQty}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{(itemPrice * itemQty).toLocaleString('fr-CM')} XAF</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order total breakdown - Hide tax if tax is 0 or undefined */}
          {((order.shippingCost !== undefined && order.shippingCost !== null) || (order.tax !== undefined && order.tax > 0)) && (
            <div className="space-y-2 mb-6 pb-6 border-b border-outline-variant/20 text-sm">
              {order.shippingCost !== undefined && order.shippingCost !== null && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Shipping</span>
                  <span>{order.shippingCost > 0 ? `${order.shippingCost.toLocaleString('fr-CM')} XAF` : 'Free'}</span>
                </div>
              )}
              {order.tax !== undefined && order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Tax (VAT)</span>
                  <span>{order.tax.toLocaleString('fr-CM')} XAF</span>
                </div>
              )}
            </div>
          )}

          {/* Shipping + payment details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Shipping To</p>
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-sm text-on-surface-variant">{address}</p>
              <p className="text-sm text-on-surface-variant">{city}</p>
              {phone && <p className="text-sm text-on-surface-variant mt-1">{phone}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Payment Method</p>
              <p className="text-sm font-semibold">{paymentLabel}</p>
              {(paymentKey === 'mtn' || paymentKey === 'orange' || paymentKey === 'fapshi') && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Check your phone for a payment confirmation prompt.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 mb-10">
          <h3 className="font-headline text-lg mb-6">What happens next</h3>
          <div className="space-y-4">
            {[
              { icon: 'mark_email_read', text: email ? `A confirmation will be sent to ${email}` : 'A confirmation email will be sent shortly' },
              { icon: 'inventory_2', text: 'Your order will be prepared and packaged within 1–2 business days' },
              { icon: 'local_shipping', text: 'Delivery to ' + city + ' typically takes 2–5 business days' },
              { icon: 'support_agent', text: 'Questions? Reach us via the chat below or email support@claireskiin.cm' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">{step.icon}</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/shop"
            className="flex-1 text-center py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
            Continue Shopping
          </Link>
          <Link to="/"
            className="flex-1 text-center py-4 border border-outline/30 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-surface-container-low transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
