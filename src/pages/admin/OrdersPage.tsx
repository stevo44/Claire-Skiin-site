import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../components/ToastContainer';
import { buildOrderWhatsAppLink, formatWhatsAppNumber } from '../../utils/whatsapp';

interface Order {
  id: string | number;
  status: string;
  total_amount: number;
  shipping_address: {
    full_name?: string;
    city?: string;
    town?: string;
    phone?: string;
    email?: string;
    deliveryMethod?: string;
    agencyName?: string;
    destinationOffice?: string;
  } | string | null;
  payment_method?: string;
  created_at: string;
  customer_name?: string;
  customer_location?: string;
  whatsapp_number?: string;
  user_name?: string;
  delivery_method?: string;
  agency_id?: number;
}

type StatusFilter = 'All' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_STYLES: Record<string, string> = {
  delivered:  'bg-green-50 text-green-700',
  processing: 'bg-amber-50 text-amber-700',
  pending:    'bg-yellow-50 text-yellow-700',
  shipped:    'bg-blue-50 text-blue-700',
  cancelled:  'bg-red-50 text-red-700',
  refunded:   'bg-stone-100 text-stone-600',
};

const FALLBACK: Order[] = [
  { id: 'cs-92831', status: 'delivered',  total_amount: 65500,  shipping_address: { full_name: "Marie-Noëlle Eto'o", city: 'Yaoundé', phone: '+237675501234' }, payment_method: 'MTN Mobile Money', created_at: '2024-10-24T10:30:00Z', customer_name: "Marie-Noëlle Eto'o", customer_location: 'Yaoundé, CM'   },
  { id: 'cs-92832', status: 'processing', total_amount: 124000, shipping_address: { full_name: 'Jean-Paul Kedi',      city: 'Douala',  phone: '+237699112233' }, payment_method: 'Orange Money',      created_at: '2024-10-25T08:15:00Z', customer_name: 'Jean-Paul Kedi',      customer_location: 'Douala, CM'    },
  { id: 'cs-92833', status: 'shipped',    total_amount: 32900,  shipping_address: { full_name: 'Sophie Abena',        city: 'Kribi',   phone: '+237677889900' }, payment_method: 'MTN Mobile Money', created_at: '2024-10-25T14:00:00Z', customer_name: 'Sophie Abena',        customer_location: 'Kribi, CM'     },
];

const STATUS_OPTIONS  = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const FILTER_OPTIONS: StatusFilter[] = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<StatusFilter>('All');
  const [search, setSearch]           = useState('');
  const [updatingId, setUpdatingId]   = useState<string | number | null>(null);

  useEffect(() => {
    adminService.getOrders()
      .then((d: any) => setOrders(d.orders ?? FALLBACK))
      .catch(() => setOrders(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter !== 'All') list = list.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        String(o.id).toLowerCase().includes(q) ||
        (o.customer_name ?? o.user_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filter, search]);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    const prev = order.status;
    setOrders(p => p.map(o => String(o.id) === String(order.id) ? { ...o, status: newStatus } : o));
    setUpdatingId(order.id);
    try {
      await adminService.updateOrderStatus(order.id, newStatus);
      showToast(`Order #${String(order.id).slice(-5).toUpperCase()} → ${newStatus}`, 'check_circle');
    } catch {
      setOrders(p => p.map(o => String(o.id) === String(order.id) ? { ...o, status: prev } : o));
      showToast('Failed to update order status', 'error', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getName = (o: Order) => {
    if (o.customer_name) return o.customer_name;
    if (o.user_name) return o.user_name;
    if (typeof o.shipping_address === 'object' && o.shipping_address?.full_name) {
      return o.shipping_address.full_name;
    }
    if (typeof o.shipping_address === 'string') {
      try {
        const parsed = JSON.parse(o.shipping_address);
        if (parsed.fullName) return parsed.fullName;
      } catch {}
    }
    return 'Valued Customer';
  };

  const getCity = (o: Order) => {
    if (o.customer_location) return o.customer_location;
    if (typeof o.shipping_address === 'object' && o.shipping_address) {
      return o.shipping_address.town || o.shipping_address.city || '—';
    }
    if (typeof o.shipping_address === 'string') {
      try {
        const parsed = JSON.parse(o.shipping_address);
        return parsed.town || parsed.city || '—';
      } catch {}
    }
    return '—';
  };

  const getPhone = (o: Order) => {
    if (o.whatsapp_number) return o.whatsapp_number;
    if (typeof o.shipping_address === 'object' && o.shipping_address?.phone) {
      return o.shipping_address.phone;
    }
    if (typeof o.shipping_address === 'string') {
      try {
        const parsed = JSON.parse(o.shipping_address);
        if (parsed.phone) return parsed.phone;
      } catch {}
    }
    return '';
  };

  const getDeliveryDetails = (o: Order) => {
    let method = o.delivery_method;
    let agencyName: string | undefined;
    let office: string | undefined;

    if (typeof o.shipping_address === 'object' && o.shipping_address) {
      if (!method && o.shipping_address.deliveryMethod) method = o.shipping_address.deliveryMethod;
      agencyName = o.shipping_address.agencyName;
      office = o.shipping_address.destinationOffice;
    } else if (typeof o.shipping_address === 'string') {
      try {
        const parsed = JSON.parse(o.shipping_address);
        if (!method && parsed.deliveryMethod) method = parsed.deliveryMethod;
        agencyName = parsed.agencyName;
        office = parsed.destinationOffice;
      } catch {}
    }

    return { method: method || 'local_delivery', agencyName, office };
  };

  const handleNotifyWhatsApp = (o: Order) => {
    const phone = getPhone(o);
    if (!phone) {
      showToast('No phone/WhatsApp number available for this order', 'error', 'error');
      return;
    }

    const { method, agencyName, office } = getDeliveryDetails(o);
    const town = getCity(o);

    const link = buildOrderWhatsAppLink({
      id: o.id,
      customerName: getName(o),
      phone,
      status: o.status,
      totalAmount: o.total_amount,
      deliveryMethod: method,
      agencyName,
      destinationOffice: office,
      town,
    });

    if (link) {
      window.open(link, '_blank');
      showToast('Opening WhatsApp link...', 'chat');
    } else {
      showToast('Invalid phone format for WhatsApp', 'error', 'error');
    }
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const fmtDate  = (iso: string)  => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const revenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const pending  = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
  const avg      = orders.length ? Math.round(revenue / orders.length) : 0;

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="mb-10">
        <h2 className="font-headline text-3xl text-on-surface mb-2">Order Management</h2>
        <p className="text-stone-500 max-w-2xl">Review, fulfill, and notify customers directly via WhatsApp manual-assist.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Revenue',    value: `${revenue.toLocaleString('fr-CM')} XAF`, sub: 'All orders combined',   color: 'text-primary'    },
          { label: 'Needs Attention',  value: `${pending} Orders`,                       sub: 'Pending or processing', color: 'text-amber-600'  },
          { label: 'Avg. Order Value', value: `${avg.toLocaleString('fr-CM')} XAF`,      sub: 'Per transaction',       color: 'text-on-surface' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-stone-100">
            <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-2">{s.label}</p>
            <p className={`text-2xl font-headline font-bold ${s.color} mb-1`}>{s.value}</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-stone-100 shadow-sm">
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 bg-stone-50/50">
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order or customer..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-stone-200 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {FILTER_OPTIONS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap capitalize transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-stone-50">
                {['Order ID', 'Customer', 'Date', 'Total', 'Fulfillment', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-label uppercase tracking-widest text-stone-400 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/50">
              {loading
                ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="h-8 bg-stone-100 rounded animate-pulse" /></td></tr>)
                : filtered.length === 0
                ? <tr><td colSpan={7} className="text-center py-16 text-stone-400">No orders found.</td></tr>
                : filtered.map(order => {
                    const phone = getPhone(order);
                    const { method, agencyName } = getDeliveryDetails(order);

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-5 font-mono text-xs font-semibold uppercase">#{String(order.id).slice(-5).toUpperCase()}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{initials(getName(order))}</div>
                            <div>
                              <p className="text-xs font-semibold">{getName(order)}</p>
                              <p className="text-[10px] text-stone-400">{getCity(order)} {phone ? `· ${phone}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-stone-500 whitespace-nowrap">{fmtDate(order.created_at)}</td>
                        <td className="px-6 py-5 font-semibold text-sm whitespace-nowrap">{order.total_amount.toLocaleString('fr-CM')} XAF</td>
                        <td className="px-6 py-5 text-xs text-stone-600">
                          {method === 'local_delivery' && <span className="text-emerald-700 font-semibold">🛵 Local Buea</span>}
                          {method === 'agency_shipping' && <span className="text-blue-700 font-semibold">🚌 Agency ({agencyName || 'Motor Park'})</span>}
                          {method === 'pickup' && <span className="text-amber-700 font-semibold">🏬 Spa Pickup</span>}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest capitalize ${STATUS_STYLES[order.status] ?? 'bg-stone-100 text-stone-600'}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* WhatsApp Direct Notify Button */}
                            <button
                              onClick={() => handleNotifyWhatsApp(order)}
                              title="Notify Customer via WhatsApp"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">chat</span>
                              WhatsApp
                            </button>

                            {updatingId === order.id && <span className="w-3 h-3 border-2 border-stone-300 border-t-primary rounded-full animate-spin" />}
                            <select value={order.status} onChange={e => handleStatusChange(order, e.target.value)} disabled={updatingId === order.id}
                              className="text-[10px] font-bold uppercase tracking-widest bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 capitalize transition-colors">
                              {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
