import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { PRODUCTS } from '../../data/products';

interface KPIs {
  todayRevenue: number;
  activeOrders: number;
  totalClients: number;
  lowStock: number;
  pendingOrders: number;
  revenueChange: string;
}

const FALLBACK_KPIS: KPIs = {
  todayRevenue: 145000,
  activeOrders: 18,
  totalClients: 1240,
  lowStock: 5,
  pendingOrders: 3,
  revenueChange: '+5.2%',
};

// Sparkline from static weekly data (replace with API data when available)
const WEEKLY_DATA = [80, 70, 85, 50, 60, 30, 40, 10, 20];

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardKPIs()
      .then(data => setKpis(data))
      .catch(() => setKpis(FALLBACK_KPIS))
      .finally(() => setLoading(false));
  }, []);

  const data = kpis ?? FALLBACK_KPIS;

  const stats = [
    { label: 'Today Revenue', value: `${data.todayRevenue.toLocaleString('fr-CM')} XAF`, trend: data.revenueChange, icon: 'payments', positive: true },
    { label: 'Active Orders', value: String(data.activeOrders), trend: `${data.pendingOrders} Pending`, icon: 'shopping_bag', positive: false },
    { label: 'Total Clients', value: data.totalClients.toLocaleString(), trend: '+12 New', icon: 'group', positive: true },
    { label: 'Low Stock', value: `${data.lowStock} Items`, trend: 'Needs Attention', icon: 'inventory_2', positive: false },
  ];

  // SVG sparkline path from data points
  const svgPath = (() => {
    const w = 400, h = 100;
    const max = Math.max(...WEEKLY_DATA);
    const pts = WEEKLY_DATA.map((v, i) => `${(i / (WEEKLY_DATA.length - 1)) * w},${h - (v / max) * (h - 10)}`);
    return `M${pts.join(' L')}`;
  })();

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="mb-10">
        <h2 className="font-headline text-3xl text-on-surface mb-2">Boutique Overview</h2>
        <p className="text-stone-500 max-w-2xl">
          Welcome back, Admin. Here is the pulse of the Claire Skiin sanctuary today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-stone-100 h-28 animate-pulse bg-stone-100" />
            ))
          : stats.map((s, i) => (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-tertiary">{s.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.positive ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {s.trend}
                  </span>
                </div>
                <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-1">{s.label}</p>
                <p className="text-xl font-headline font-bold text-on-surface">{s.value}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sparkline chart */}
        <div className="col-span-1 lg:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-xl">Weekly Momentum</h3>
            <Link to="/admin/analytics" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Full Analytics <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="h-48 w-full relative">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006c0c" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#006c0c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={svgPath + ` L400,100 L0,100 Z`} fill="url(#lineGrad)" />
              <path d={svgPath} fill="none" stroke="#006c0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {WEEKLY_DATA.map((v, i) => {
                const max = Math.max(...WEEKLY_DATA);
                const x = (i / (WEEKLY_DATA.length - 1)) * 400;
                const y = 100 - (v / max) * 90;
                return <circle key={i} cx={x} cy={y} r="3.5" fill="#006c0c" />;
              })}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-stone-400 font-label uppercase tracking-widest px-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>

        {/* Quick actions + recent activity */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-8 rounded-xl">
            <h4 className="font-headline text-lg mb-2">Quick Creation</h4>
            <p className="text-xs opacity-80 mb-6">Instantly add a new luxury botanical to your catalog.</p>
            <Link to="/admin/products/add"
              className="w-full bg-white/10 backdrop-blur-sm py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">add</span>
              New Product
            </Link>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-stone-100">
            <h4 className="text-[10px] font-label uppercase tracking-widest text-stone-400 mb-4">Top Products Today</h4>
            <div className="space-y-3">
              {PRODUCTS.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-stone-400">{p.priceDisplay}</p>
                  </div>
                  {p.badge && <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold uppercase">{p.badge}</span>}
                </div>
              ))}
            </div>
            <Link to="/admin/products" className="block text-center mt-5 text-[10px] uppercase font-bold text-tertiary tracking-widest hover:underline">
              View All Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
