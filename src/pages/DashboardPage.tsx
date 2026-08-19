import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useSocket } from '../hooks/useSocket';
import { useProducts } from '../store/productStore';
import { showToast } from '../components/ToastContainer';

interface KPIs {
  totalSales: number;
  totalOrders: number;
  totalUsers: number;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
}
interface RecentOrder {
  id: string | number;
  total_amount: number;
  status: string;
  created_at: string;
  user_name?: string;
  customer_name?: string;
}
interface TopProduct {
  id: string | number;
  name: string;
  total_sold: number;
  revenue: number;
}

const FALLBACK: KPIs = {
  totalSales: 0, totalOrders: 0, totalUsers: 0,
  recentOrders: [], topProducts: [],
};

const STATUS_COLORS: Record<string, string> = {
  delivered:  'bg-green-50 text-green-700',
  processing: 'bg-amber-50 text-amber-700',
  pending:    'bg-yellow-50 text-yellow-700',
  shipped:    'bg-blue-50 text-blue-700',
  cancelled:  'bg-red-50 text-red-700',
};

function buildSparkline(values: number[], w = 400, h = 100) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) =>
    `${(i / Math.max(values.length - 1, 1)) * w},${h - (v / max) * (h - 10)}`
  );
  return `M${pts.join(' L')}`;
}

export default function DashboardPage() {
  const [kpis, setKpis]               = useState<KPIs>(FALLBACK);
  const [revenue, setRevenue]         = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading]         = useState(true);
  const [newOrderCount, setNewOrders] = useState(0);
  const [recentLiveOrders, setLiveOrders] = useState<RecentOrder[]>([]);

  const { socket, isConnected } = useSocket();
  const { products, lowStockProducts } = useProducts();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, revData] = await Promise.allSettled([
        adminService.getDashboardKPIs(),
        adminService.getRevenueTrends(),
      ]);

      if (kpiData.status === 'fulfilled') {
        setKpis({ ...FALLBACK, ...kpiData.value });
      }
      if (revData.status === 'fulfilled' && Array.isArray(revData.value) && revData.value.length) {
        setRevenue(revData.value.map((r: any) => ({
          label: new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short' }),
          value: parseFloat(r.revenue) || 0,
        })));
      }
    } catch {
      // fallback already set
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Socket: live order + product events
  useEffect(() => {
    if (!socket) return;

    socket.on('order:new', (data: any) => {
      setNewOrders(n => n + 1);
      const order = data.order ?? data;
      setLiveOrders(prev => [order, ...prev].slice(0, 5));
      showToast('New order received!', 'shopping_bag');
      fetchAll(); // refresh KPIs
    });

    socket.on('order:status_updated', () => { fetchAll(); });
    socket.on('product:created', () => { fetchAll(); });
    socket.on('product:updated', () => { fetchAll(); });
    socket.on('product:deleted', () => { fetchAll(); });

    return () => {
      socket.off('order:new');
      socket.off('order:status_updated');
      socket.off('product:created');
      socket.off('product:updated');
      socket.off('product:deleted');
    };
  }, [socket, fetchAll]);

  const revenueValues = revenue.map(r => r.value);
  const svgPath = buildSparkline(revenueValues);
  const maxRev  = Math.max(...revenueValues, 1);

  const pendingCount = kpis.recentOrders.filter(o =>
    o.status === 'pending' || o.status === 'processing'
  ).length;

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: `${kpis.totalSales.toLocaleString('fr-CM')} XAF`,
      sub: 'All completed orders',
      icon: 'payments',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      label: 'Total Orders',
      value: `${kpis.totalOrders + newOrderCount}`,
      sub: `${pendingCount} pending action`,
      icon: 'shopping_bag',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Registered Clients',
      value: kpis.totalUsers.toLocaleString(),
      sub: 'Active user accounts',
      icon: 'group',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Low Stock Alerts',
      value: `${lowStockProducts.length}`,
      sub: 'Products under 10 units',
      icon: 'inventory_2',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  const allRecentOrders = [...recentLiveOrders, ...kpis.recentOrders].slice(0, 5);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-headline text-3xl text-on-surface mb-1">Boutique Overview</h2>
          <p className="text-stone-500 text-sm">Live pulse of the Claire Skiin sanctuary.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${isConnected ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <button onClick={fetchAll} className="text-stone-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-stone-100" title="Refresh">
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* New order live alert */}
      {newOrderCount > 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-5 py-3 rounded-xl text-sm font-semibold">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
          {newOrderCount} new order{newOrderCount > 1 ? 's' : ''} received since you opened this page
          <Link to="/admin/orders" className="ml-auto text-green-700 text-xs font-bold uppercase tracking-widest hover:underline">View Orders</Link>
          <button onClick={() => setNewOrders(0)} className="text-green-600 hover:text-green-800 ml-2">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="w-10 h-10 bg-stone-100 rounded-xl" />
                <div className="h-3 w-20 bg-stone-100 rounded" />
                <div className="h-7 w-28 bg-stone-100 rounded" />
              </div>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <span className={`material-symbols-outlined ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                </div>
                <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-headline font-bold ${s.color} mb-1`}>{s.value}</p>
                <p className="text-[10px] text-stone-400">{s.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Main grid: chart + quick panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-stone-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-headline text-xl text-on-surface">Weekly Revenue</h3>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">XAF · Last 7 days from DB</p>
            </div>
            <Link to="/admin/analytics" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Full Analytics <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="h-52 w-full relative">
            {loading ? (
              <div className="w-full h-full bg-stone-50 rounded-xl animate-pulse" />
            ) : revenueValues.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-2">
                <span className="material-symbols-outlined text-[48px]">show_chart</span>
                <p className="text-xs">Revenue data will appear once orders are completed</p>
              </div>
            ) : (
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006c0c" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#006c0c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${svgPath} L400,100 L0,100 Z`} fill="url(#revGrad)" />
                <path d={svgPath} fill="none" stroke="#006c0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {revenueValues.map((v, i) => {
                  const x = (i / Math.max(revenueValues.length - 1, 1)) * 400;
                  const y = 100 - (v / maxRev) * 90;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#006c0c" />
                      <title>{`${revenue[i]?.label}: ${v.toLocaleString('fr-CM')} XAF`}</title>
                    </g>
                  );
                })}
              </svg>
            )}
            {revenue.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-stone-400 uppercase tracking-widest px-1">
                {revenue.map(r => <span key={r.label}>{r.label}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl p-6">
            <h4 className="font-headline text-lg mb-1">Quick Actions</h4>
            <p className="text-xs opacity-80 mb-5">Manage your boutique instantly.</p>
            <div className="space-y-2">
              {[
                { label: 'Add New Product',   icon: 'add_circle',    to: '/admin/products/add' },
                { label: 'View All Orders',   icon: 'shopping_bag',  to: '/admin/orders'       },
                { label: 'Manage Users',      icon: 'group',         to: '/admin/users'         },
                { label: 'Spa Bookings',      icon: 'spa',           to: '/admin/spa'           },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors text-xs font-bold uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Top products from DB */}
          {kpis.topProducts.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <h4 className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-4">Top Selling Products</h4>
              <div className="space-y-3">
                {kpis.topProducts.slice(0, 4).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-stone-400">{p.total_sold} sold · {Number(p.revenue).toLocaleString('fr-CM')} XAF</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom grid: recent orders + low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 py-5 border-b border-stone-100">
            <h3 className="font-headline text-lg">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-primary font-bold hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-stone-50">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-stone-100 rounded" />
                    <div className="h-2 w-20 bg-stone-100 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-stone-100 rounded-full" />
                </div>
              ))
            ) : allRecentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-stone-400 text-sm">No orders yet</div>
            ) : allRecentOrders.map((order, i) => (
              <div key={`${order.id}-${i}`} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {(order.user_name || order.customer_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{order.user_name || order.customer_name || `Order #${String(order.id).slice(-5).toUpperCase()}`}</p>
                  <p className="text-[10px] text-stone-400">{Number(order.total_amount).toLocaleString('fr-CM')} XAF · {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${STATUS_COLORS[order.status] || 'bg-stone-100 text-stone-600'}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts — live from ProductStore */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 py-5 border-b border-stone-100">
            <h3 className="font-headline text-lg flex items-center gap-2">
              Low Stock Alerts
              {lowStockProducts.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{lowStockProducts.length}</span>
              )}
            </h3>
            <Link to="/admin/products" className="text-xs text-primary font-bold hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-stone-50">
            {products.length === 0 ? (
              <div className="px-6 py-12 text-center text-stone-400 text-sm animate-pulse">Loading products…</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-[40px] text-green-300 block mb-2">inventory</span>
                <p className="text-sm text-stone-400">All products are well stocked</p>
              </div>
            ) : lowStockProducts.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {(p.img || p.image_url) && <img src={p.img || p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-stone-400">{p.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${(p.stock_quantity ?? 0) === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock_quantity ?? 0} left
                  </p>
                  <p className="text-[9px] text-stone-400">{(p.stock_quantity ?? 0) === 0 ? 'Out of stock' : 'Low stock'}</p>
                </div>
                <Link to="/admin/products" className="p-1.5 text-stone-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
