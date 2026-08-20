/**
 * pages/admin/AnalyticsPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production analytics dashboard.
 *
 * ALL data comes from GET /api/admin/analytics/dashboard?range=... — one
 * request, everything in parallel server-side.  No fake/hardcoded values.
 *
 * Charting library: Recharts (already in package.json)
 * Visual style: matches existing admin card/tile language
 *
 * FAKE DATA REMOVED (Part A audit):
 *   ✗ Traffic Sources (Organic/Social/Direct/Referral) — never tracked
 *   ✗ Sessions by Channel donut — same fake CHANNELS constant
 *   ✗ Avg. Session Value — hardcoded '38,500 XAF', no session tracking built
 *   ✗ Trend % arrows on KPI tiles — all hardcoded strings
 *   ✗ Top Products by price-proxy ranking — fabricated units & percentages
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { adminService } from '../../services/adminService';

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmtXAF = (n: number) =>
  `${n.toLocaleString('fr-FR')} XAF`;
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M XAF`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K XAF`
  : `${n} XAF`;
const fmtPct = (n: number) => `${Number(n).toFixed(1)}%`;
const fmtSecs = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

// ── Palette ───────────────────────────────────────────────────────────────────
const GREEN  = '#006c0c';
const AMBER  = '#b45309';
const RED    = '#b91c1c';
const COLORS = ['#006c0c','#15803d','#4ade80','#86efac','#bbf7d0','#a3c070','#735c00','#d97706','#f59e0b'];

// ── Sub-components ────────────────────────────────────────────────────────────

/** Generic section wrapper */
function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="space-y-5">
      <h2 className="font-headline text-2xl text-on-surface border-b border-stone-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

/** Card shell */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-100 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

/** KPI tile */
function KpiTile({ label, value, icon, accent = 'green' }:
  { label: string; value: string; icon: string; accent?: 'green'|'amber'|'red'|'stone' }) {
  const bg = accent === 'green' ? 'bg-green-50 text-green-700'
           : accent === 'amber' ? 'bg-amber-50 text-amber-700'
           : accent === 'red'   ? 'bg-red-50 text-red-700'
           : 'bg-stone-50 text-stone-500';
  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{label}</p>
      <p className="font-headline text-2xl font-bold text-on-surface">{value}</p>
    </div>
  );
}

/** Empty state placeholder */
function Empty({ msg = 'No data yet for this period' }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-2">
      <span className="material-symbols-outlined text-4xl">inbox</span>
      <p className="text-sm">{msg}</p>
    </div>
  );
}

/** Loading skeleton */
function Skeleton({ h = 'h-48' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-stone-100 animate-pulse`} />;
}

/** Funnel chart (narrowing horizontal bars with drop-off labels) */
function FunnelChart({ stages }: { stages: { stage: string; event_type: string; count: number }[] }) {
  if (!stages?.length || stages.every(s => s.count === 0)) return <Empty />;
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-3 py-2">
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        const dropOff = i > 0 && stages[i - 1].count > 0
          ? ((1 - s.count / stages[i - 1].count) * 100).toFixed(1)
          : null;
        return (
          <div key={s.event_type}>
            {dropOff !== null && (
              <p className="text-[10px] text-amber-600 font-bold mb-1 pl-2">
                ▼ {dropOff}% drop-off
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-36 shrink-0 font-medium">{s.stage}</span>
              <div className="flex-1 h-8 bg-stone-100 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 flex items-center pl-3"
                  style={{ width: `${pct}%`, background: GREEN, opacity: 1 - i * 0.18 }}
                >
                  <span className="text-white text-[10px] font-bold whitespace-nowrap">
                    {s.count.toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Donut chart wrapper */
function Donut({ data }: { data: { label: string; count: number }[] }) {
  if (!data?.length || data.every(d => d.count === 0)) return <Empty />;
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%"
            innerRadius={45} outerRadius={70} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-FR')} (${((v/total)*100).toFixed(1)}%)`]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-stone-600 font-medium">{d.label}</span>
            <span className="text-xs text-stone-400 ml-1">{fmtPct((d.count/total)*100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked list (top searches, wishlist demand etc.) */
function RankedList({ rows, valueKey, labelKey, valueFormat }:
  { rows: any[]; valueKey: string; labelKey: string; valueFormat?: (v: any) => string }) {
  if (!rows?.length) return <Empty />;
  const max = Math.max(...rows.map(r => Number(r[valueKey])), 1);
  const fmt = valueFormat ?? ((v: any) => String(v));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[10px] font-black text-stone-300 w-4 text-right shrink-0">{i+1}</span>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-on-surface truncate">{r[labelKey]}</span>
              <span className="text-xs font-bold text-primary shrink-0 ml-2">{fmt(r[valueKey])}</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary/70 transition-all duration-700"
                style={{ width: `${(Number(r[valueKey])/max)*100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sortable table */
function SortableTable({ cols, rows, emptyMsg }:
  { cols: { key: string; label: string; fmt?: (v: any, row?: any) => string }[];
    rows: any[]; emptyMsg?: string }) {
  const [sortKey, setSortKey] = useState(cols[1]?.key || cols[0].key);
  const [asc, setAsc] = useState(false);
  if (!rows?.length) return <Empty msg={emptyMsg} />;
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100">
            {cols.map(c => (
              <th key={c.key}
                className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 cursor-pointer hover:text-primary select-none"
                onClick={() => { if (sortKey===c.key) setAsc(!asc); else { setSortKey(c.key); setAsc(false); } }}>
                {c.label}{sortKey===c.key ? (asc?' ↑':' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
              {cols.map(c => (
                <td key={c.key} className="py-2.5 px-3 text-stone-700">
                  {c.fmt ? c.fmt(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange]   = useState<'7d'|'30d'|'90d'>('30d');
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string|null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    adminService.getAnalyticsDashboard(range)
      .then((d: any) => setData(d?.data ?? d))
      .catch(() => setError('Failed to load analytics. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── "Needs Attention" callout items ──────────────────────────────────────
  const attentionItems: { label: string; detail: string; level: 'red'|'amber' }[] = [];
  if (data) {
    // Zero-result searches
    const zeroRes = data.searchInsights?.zeroResultSearches ?? [];
    if (zeroRes.length > 0)
      attentionItems.push({
        label: `${zeroRes.length} zero-result search term${zeroRes.length>1?'s':''}`,
        detail: `Most searched: "${zeroRes[0]?.term}" (${zeroRes[0]?.count}×) — product not stocked or findable`,
        level: 'amber',
      });

    // Biggest funnel drop-off
    const stages = data.funnel?.stages ?? [];
    let worstDrop = 0, worstStage = '';
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i-1].count;
      if (prev > 0) {
        const drop = (1 - stages[i].count / prev) * 100;
        if (drop > worstDrop) { worstDrop = drop; worstStage = stages[i].stage; }
      }
    }
    if (worstDrop > 50)
      attentionItems.push({
        label: `${worstDrop.toFixed(0)}% funnel drop-off at "${worstStage}"`,
        detail: 'More than half of users abandon at this step',
        level: worstDrop > 70 ? 'red' : 'amber',
      });

    // Worst-performing coupon (highest applied, lowest completion rate)
    const coupons = [...(data.couponPerformance ?? [])].sort((a: any, b: any) => a.completionRate - b.completionRate);
    if (coupons.length > 0 && coupons[0].appliedCount >= 3 && coupons[0].completionRate < 20)
      attentionItems.push({
        label: `Coupon "${coupons[0].code}" has ${coupons[0].completionRate}% completion rate`,
        detail: `Applied ${coupons[0].appliedCount}× but only ${coupons[0].completedCount} led to a completed order`,
        level: 'amber',
      });

    // Fast-declining rating
    const declining = (data.ratingTrends ?? []).filter((r: any) => r.delta < -0.5);
    if (declining.length > 0)
      attentionItems.push({
        label: `${declining.length} product${declining.length>1?'s':''} with declining ratings`,
        detail: `"${declining[0]?.name}" dropped ${Math.abs(declining[0]?.delta).toFixed(2)} stars in the last 30 days`,
        level: 'red',
      });

    // High refund rate products
    const highRefund = (data.refundRate?.perProduct ?? []).filter((r: any) => r.refund_rate > 20);
    if (highRefund.length > 0)
      attentionItems.push({
        label: `${highRefund.length} product${highRefund.length>1?'s':''} with refund rate >20%`,
        detail: `"${highRefund[0]?.name}" — ${highRefund[0]?.refund_rate}% of orders refunded`,
        level: 'red',
      });
  }

  // ── Revenue chart data ────────────────────────────────────────────────────
  const revenueData = (data?.revenueTrends ?? []).map((p: any) => ({
    label: p.label,
    revenue: p.value,
  }));
  const totalRevenue = revenueData.reduce((s: number, d: any) => s + d.revenue, 0);

  // ── Delivery split ───────────────────────────────────────────────────────
  const DELIVERY_LABELS: Record<string, string> = {
    local_delivery: 'Local Delivery',
    agency_shipping: 'Agency Shipping',
    pickup: 'Pickup',
  };
  const deliverySplit = (data?.deliveryInsights?.methodSplit ?? []).map((d: any) => ({
    label: DELIVERY_LABELS[d.method] ?? d.method,
    count: d.count,
  }));

  // ── Device / browser split ───────────────────────────────────────────────
  const deviceData  = (data?.deviceBrowser?.devices  ?? []).map((d: any) => ({ label: d.label, count: d.count }));
  const browserData = (data?.deviceBrowser?.browsers ?? []).map((d: any) => ({ label: d.label, count: d.count }));

  // ── Category donut ───────────────────────────────────────────────────────
  const categoryData = (data?.categoryPerf ?? []).map((c: any) => ({ label: c.category, count: c.revenue }));

  // ── Coupon organic split ─────────────────────────────────────────────────
  const couponOrganic = data?.couponVsOrganic ?? [];
  const organic = couponOrganic.find((r: any) => r.type === 'organic');
  const couponDriven = couponOrganic.find((r: any) => r.type === 'coupon');
  const totalRev = (organic?.revenue ?? 0) + (couponDriven?.revenue ?? 0);

  // ── Peak times chart data ────────────────────────────────────────────────
  const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const peakDow = (data?.peakTimes?.byDayOfWeek ?? []).map((d: any) => ({
    day: DOW_NAMES[d.dow] ?? d.dayName,
    orders: d.orderCount,
  }));
  const peakHour = (data?.peakTimes?.byHour ?? []).map((d: any) => ({
    hour: `${String(d.hour).padStart(2,'0')}:00`,
    orders: d.orderCount,
  }));

  return (
    <div className="animate-in fade-in duration-500 space-y-12 pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-tertiary font-bold mb-2 block">Performance Overview</span>
          <h1 className="font-headline text-4xl text-on-surface">Analytics <span className="text-tertiary italic">Centre</span></h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['7d','30d','90d'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${range===r ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}>
              {r==='7d'?'7 Days':r==='30d'?'30 Days':'90 Days'}
            </button>
          ))}
          <button onClick={fetch} title="Refresh"
            className="ml-1 p-2.5 rounded-xl bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── KPI Row (real data only) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} h="h-32" />)
        : <>
          <KpiTile label="Total Revenue" icon="payments"
            value={fmtShort(totalRevenue)} accent="green" />
          <KpiTile label="Conversion Rate" icon="conversion_path"
            value={data?.conversionRate?.conversion_rate != null
              ? fmtPct(data.conversionRate.conversion_rate) : '—'} accent="green" />
          <KpiTile label="Cart Abandonment" icon="shopping_cart_off"
            value={data?.cartAbandonment?.abandonment_rate != null
              ? fmtPct(data.cartAbandonment.abandonment_rate) : '—'} accent="amber" />
          <KpiTile label="Repeat Customer Rate" icon="group"
            value={data?.repeatCustomers?.repeatRate != null
              ? fmtPct(data.repeatCustomers.repeatRate) : '—'} accent="green" />
        </>}
      </div>

      {/* ── Needs Attention ── */}
      {!loading && attentionItems.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-amber-600">warning</span>
            <h2 className="font-headline text-lg text-amber-800 font-bold">Needs Attention</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map((item, i) => (
              <div key={i}
                className={`rounded-xl p-4 border ${item.level==='red'
                  ? 'bg-red-50 border-red-200' : 'bg-amber-100 border-amber-200'}`}>
                <p className={`text-sm font-bold mb-0.5 ${item.level==='red' ? 'text-red-700' : 'text-amber-800'}`}>
                  {item.label}
                </p>
                <p className={`text-xs ${item.level==='red' ? 'text-red-600' : 'text-amber-700'}`}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Trend ── */}
      <Section title="Revenue Trend" id="revenue">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-headline text-xl text-on-surface">Revenue Over Time</h3>
              <p className="text-xs text-stone-400 mt-0.5">Completed orders only · XAF</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-headline font-bold text-primary">{fmtShort(totalRevenue)}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">this period</p>
            </div>
          </div>
          {loading ? <Skeleton /> : revenueData.length === 0 ? <Empty msg="No completed orders in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v: number) => [fmtXAF(v), 'Revenue']} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2.5}
                  fill="url(#revGrad)" dot={{ fill: GREEN, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      {/* ── Sales Funnel ── */}
      <Section title="Sales Funnel" id="funnel">
        <Card>
          <p className="text-xs text-stone-400 mb-6">Product view → purchase — drop-off at each stage</p>
          {loading ? <Skeleton /> : <FunnelChart stages={data?.funnel?.stages ?? []} />}
        </Card>
      </Section>

      {/* ── Search & Demand ── */}
      <Section title="Search & Demand" id="search">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-4">Top Searched Terms</h3>
            {loading ? <Skeleton h="h-40" /> :
              <RankedList rows={data?.searchInsights?.topSearches ?? []}
                labelKey="term" valueKey="count"
                valueFormat={(v) => `${v}×`} />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-1">Zero / Low-Result Searches</h3>
            <p className="text-xs text-stone-400 mb-4">Demand for things not stocked or discoverable</p>
            {loading ? <Skeleton h="h-40" /> :
              <div className="space-y-2">
                {(data?.searchInsights?.zeroResultSearches ?? []).length === 0
                  ? <Empty msg="No zero-result searches — great discoverability!" />
                  : (data?.searchInsights?.zeroResultSearches ?? []).map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-semibold text-amber-800">"{r.term}"</span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{r.count}× searched</span>
                    </div>
                  ))}
              </div>}
          </Card>
        </div>
      </Section>

      {/* ── Coupons & Promotions ── */}
      <Section title="Coupons & Promotions" id="coupons">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-4">Coupon Performance</h3>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No coupons used in this period"
                cols={[
                  { key: 'code',           label: 'Code' },
                  { key: 'appliedCount',   label: 'Applied',   fmt: (v) => v.toLocaleString('fr-FR') },
                  { key: 'completedCount', label: 'Completed', fmt: (v) => v.toLocaleString('fr-FR') },
                  { key: 'completionRate', label: 'Rate',      fmt: (v) => fmtPct(v) },
                  { key: 'totalDiscount',  label: 'Discount',  fmt: (v) => fmtXAF(v) },
                ]}
                rows={data?.couponPerformance ?? []}
              />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-1">Coupon vs. Organic Revenue</h3>
            <p className="text-xs text-stone-400 mb-4">What % of revenue came at a discount?</p>
            {loading ? <Skeleton h="h-40" /> :
              couponOrganic.length === 0 ? <Empty /> :
              <div className="space-y-4 mt-2">
                {couponOrganic.map((r: any) => {
                  const pct = totalRev > 0 ? (r.revenue / totalRev) * 100 : 0;
                  return (
                    <div key={r.type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium capitalize text-on-surface">{r.type === 'coupon' ? '🏷 Coupon-driven' : '💰 Organic'}</span>
                        <span className="font-bold text-primary">{fmtXAF(r.revenue)}</span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: r.type==='organic' ? GREEN : AMBER }} />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1">{fmtPct(pct)} of revenue · {r.orderCount} orders</p>
                    </div>
                  );
                })}
              </div>}
          </Card>
        </div>
      </Section>

      {/* ── Delivery & Fulfillment ── */}
      <Section title="Delivery & Fulfillment" id="delivery">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-6">Delivery Method Split</h3>
            {loading ? <Skeleton h="h-40" /> : <Donut data={deliverySplit} />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-4">Top Agency Routes</h3>
            <p className="text-xs text-stone-400 mb-4">Agency shipping destinations by volume</p>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No agency shipments in this period"
                cols={[
                  { key: 'agency', label: 'Agency' },
                  { key: 'town',   label: 'Destination' },
                  { key: 'count',  label: 'Orders', fmt: (v) => v.toLocaleString('fr-FR') },
                ]}
                rows={data?.deliveryInsights?.agencyBreakdown ?? []}
              />}
          </Card>
        </div>
        <Card>
          <h3 className="font-headline text-lg mb-4">Revenue by Destination Town</h3>
          {loading ? <Skeleton h="h-48" /> :
            (data?.revenueByTown ?? []).length === 0 ? <Empty /> :
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.revenueByTown ?? []} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                  tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="town" tick={{ fontSize: 11, fill: '#57534e' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v: number) => [fmtXAF(v), 'Revenue']} />
                <Bar dataKey="revenue" fill={GREEN} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>
      </Section>

      {/* ── Customers ── */}
      <Section title="Customers" id="customers">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KpiTile label="Total Customers" icon="group"
            value={loading ? '…' : (data?.repeatCustomers?.totalCustomers ?? 0).toLocaleString('fr-FR')} />
          <KpiTile label="Repeat Customers" icon="autorenew"
            value={loading ? '…' : (data?.repeatCustomers?.repeatCustomers ?? 0).toLocaleString('fr-FR')} accent="green" />
          <KpiTile label="Repeat Rate" icon="percent"
            value={loading ? '…' : fmtPct(data?.repeatCustomers?.repeatRate ?? 0)} accent="green" />
        </div>
        <Card>
          <h3 className="font-headline text-lg mb-4">Top Spenders</h3>
          {loading ? <Skeleton h="h-40" /> :
            <SortableTable
              emptyMsg="No customer spend data yet"
              cols={[
                { key: 'full_name',   label: 'Name',    fmt: (v, r) => v || r?.email },
                { key: 'order_count', label: 'Orders',  fmt: (v) => v },
                { key: 'total_spend', label: 'Spend',   fmt: (v) => fmtXAF(v) },
              ]}
              rows={data?.repeatCustomers?.topSpenders ?? []}
            />}
        </Card>
        <Card>
          <h3 className="font-headline text-lg mb-4">Wishlist Demand Signal</h3>
          <p className="text-xs text-stone-400 mb-4">Most-wishlisted products NOT in the top-10 purchased — unmet demand</p>
          {loading ? <Skeleton h="h-40" /> :
            <RankedList rows={data?.wishlistDemand ?? []}
              labelKey="name" valueKey="wishlist_count"
              valueFormat={(v) => `${v} wishlists`} />}
        </Card>
      </Section>

      {/* ── Inventory Health ── */}
      <Section title="Inventory Health" id="inventory">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-1 text-amber-700">⚠ Stock Velocity — At Risk</h3>
            <p className="text-xs text-stone-400 mb-4">At current sales pace, days of stock remaining</p>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No at-risk products in this period"
                cols={[
                  { key: 'name',          label: 'Product' },
                  { key: 'stock_quantity',label: 'Stock',      fmt: (v) => `${v} units` },
                  { key: 'units_sold',    label: 'Sold',       fmt: (v) => `${v} units` },
                  { key: 'days_of_stock', label: 'Days Left',  fmt: (v) => v == null ? 'No sales' : `${v}d` },
                ]}
                rows={data?.stockVelocity ?? []}
              />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-1 text-stone-500">Dead Stock</h3>
            <p className="text-xs text-stone-400 mb-4">≤1 unit sold this period — discount push candidates</p>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No dead stock — all products moving"
                cols={[
                  { key: 'name',          label: 'Product' },
                  { key: 'category',      label: 'Category' },
                  { key: 'stock_quantity',label: 'In Stock',   fmt: (v) => `${v} units` },
                  { key: 'price',         label: 'Price',     fmt: (v) => fmtXAF(v) },
                ]}
                rows={data?.deadStock ?? []}
              />}
          </Card>
        </div>
      </Section>

      {/* ── Engagement ── */}
      <Section title="Engagement" id="engagement">
        <Card>
          <h3 className="font-headline text-lg mb-4">Page Engagement</h3>
          <p className="text-xs text-stone-400 mb-4">Avg. time-on-page and scroll depth per URL</p>
          {loading ? <Skeleton h="h-40" /> :
            <SortableTable
              emptyMsg="No engagement data yet — page_engagement events not fired"
              cols={[
                { key: 'path',          label: 'Page' },
                { key: 'sessionCount',  label: 'Sessions',     fmt: (v) => v.toLocaleString('fr-FR') },
                { key: 'avgTimeSeconds',label: 'Avg. Time',    fmt: (v) => fmtSecs(v) },
                { key: 'avgScrollDepth',label: 'Avg. Scroll',  fmt: (v) => fmtPct(v) },
              ]}
              rows={data?.engagement ?? []}
            />}
        </Card>
      </Section>

      {/* ── Device & Traffic ── */}
      <Section title="Device & Traffic" id="devices">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-6">Device Breakdown</h3>
            {loading ? <Skeleton h="h-40" /> : <Donut data={deviceData} />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-6">Browser Breakdown</h3>
            {loading ? <Skeleton h="h-40" /> :
              deviceData.length === 0 ? <Empty msg="No device/browser data yet" /> :
              <RankedList rows={browserData} labelKey="label" valueKey="count"
                valueFormat={(v) => v.toLocaleString('fr-FR')} />}
          </Card>
        </div>
      </Section>

      {/* ── Spa & Reviews Trends ── */}
      <Section title="Spa & Reviews Trends" id="spa">
        {/* Appointment stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} h="h-28" />) :
          <>
            <KpiTile label="Total Appointments" icon="spa"
              value={(data?.appointmentStats?.overall?.total ?? 0).toLocaleString('fr-FR')} />
            <KpiTile label="Completed" icon="check_circle"
              value={(data?.appointmentStats?.overall?.completed ?? 0).toLocaleString('fr-FR')} accent="green" />
            <KpiTile label="Cancelled" icon="cancel"
              value={(data?.appointmentStats?.overall?.cancelled ?? 0).toLocaleString('fr-FR')} accent="amber" />
            <KpiTile label="Cancel / No-Show Rate" icon="event_busy"
              value={fmtPct(data?.appointmentStats?.overall?.cancelNoShowRate ?? 0)} accent="amber" />
          </>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-4">Cancellations by Service</h3>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No appointment data in this period"
                cols={[
                  { key: 'serviceName', label: 'Service' },
                  { key: 'total',       label: 'Total',     fmt: (v) => v },
                  { key: 'cancelled',   label: 'Cancelled', fmt: (v) => v },
                  { key: 'noShow',      label: 'No-Show',   fmt: (v) => v },
                ]}
                rows={data?.appointmentStats?.byService ?? []}
              />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-1">Rating Trends</h3>
            <p className="text-xs text-stone-400 mb-4">Last 30 days vs. lifetime average — find sliding products early</p>
            {loading ? <Skeleton h="h-40" /> :
              (data?.ratingTrends ?? []).length === 0
                ? <Empty msg="No reviews with sufficient data yet" />
                : <div className="space-y-2.5">
                    {(data?.ratingTrends ?? []).slice(0, 8).map((r: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 ${r.trend==='down' ? 'bg-red-50 border border-red-100' : r.trend==='up' ? 'bg-green-50 border border-green-100' : 'bg-stone-50 border border-stone-100'}`}>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{r.name}</p>
                          <p className="text-[10px] text-stone-400">Lifetime {Number(r.lifetime_avg).toFixed(2)}★ · 30d {Number(r.recent_avg).toFixed(2)}★</p>
                        </div>
                        <span className={`text-sm font-bold ${r.trend==='down'?'text-red-600':r.trend==='up'?'text-green-600':'text-stone-400'}`}>
                          {r.delta > 0 ? '+' : ''}{Number(r.delta).toFixed(2)}★
                          <span className="ml-1">{r.trend==='down'?'↓':r.trend==='up'?'↑':'→'}</span>
                        </span>
                      </div>
                    ))}
                  </div>}
          </Card>
        </div>

        {/* Payment & Refunds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-1">Payment Success by Provider</h3>
            <p className="text-xs text-stone-400 mb-4">MTN vs. Orange — high failure rate is an actionable red flag</p>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No payment data in this period"
                cols={[
                  { key: 'provider',    label: 'Provider' },
                  { key: 'total',       label: 'Total',    fmt: (v) => v },
                  { key: 'successful',  label: 'Success',  fmt: (v) => v },
                  { key: 'failed',      label: 'Failed',   fmt: (v) => v },
                  { key: 'successRate', label: 'Rate',     fmt: (v) => fmtPct(v) },
                ]}
                rows={data?.paymentStats ?? []}
              />}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-1">Refund Rate</h3>
            <p className="text-xs text-stone-400 mb-4">Overall: <strong>{fmtPct(data?.refundRate?.overall?.refundRate ?? 0)}</strong> · {loading ? '…' : `${data?.refundRate?.overall?.refunded ?? 0} of ${data?.refundRate?.overall?.totalOrders ?? 0} orders`}</p>
            {loading ? <Skeleton h="h-40" /> :
              <SortableTable
                emptyMsg="No refunds in this period"
                cols={[
                  { key: 'name',          label: 'Product' },
                  { key: 'order_count',   label: 'Orders',  fmt: (v) => v },
                  { key: 'refunded_count',label: 'Refunded',fmt: (v) => v },
                  { key: 'refund_rate',   label: 'Rate',    fmt: (v) => fmtPct(v) },
                ]}
                rows={data?.refundRate?.perProduct ?? []}
              />}
          </Card>
        </div>

        {/* Category performance + Peak times */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-headline text-lg mb-6">Category Performance</h3>
            {loading ? <Skeleton h="h-40" /> :
              <Donut data={categoryData} />}
            {!loading && (data?.categoryPerf ?? []).length > 0 && (
              <div className="mt-6 pt-4 border-t border-stone-100 space-y-2">
                {(data?.categoryPerf ?? []).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-stone-600">{c.category}</span>
                    <span className="font-semibold text-on-surface">{fmtXAF(c.revenue)} <span className="text-xs text-stone-400">({c.unitsSold} units)</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="font-headline text-lg mb-4">Peak Order Times</h3>
            {loading ? <Skeleton h="h-48" /> :
              peakDow.length === 0 ? <Empty /> :
              <>
                <p className="text-xs text-stone-400 mb-2 font-semibold uppercase tracking-widest">By Day of Week</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={peakDow} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="orders" fill={GREEN} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-stone-400 mt-6 mb-2 font-semibold uppercase tracking-widest">By Hour of Day</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={peakHour} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="orders" fill={AMBER} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>}
          </Card>
        </div>

        {/* Top purchased products (real) */}
        <Card>
          <h3 className="font-headline text-lg mb-4">Top Purchased Products</h3>
          {loading ? <Skeleton h="h-40" /> :
            <SortableTable
              emptyMsg="No completed orders yet"
              cols={[
                { key: 'name',           label: 'Product' },
                { key: 'category',       label: 'Category' },
                { key: 'total_quantity', label: 'Units Sold', fmt: (v) => v.toLocaleString('fr-FR') },
                { key: 'total_orders',   label: 'Orders',    fmt: (v) => v.toLocaleString('fr-FR') },
              ]}
              rows={data?.topProducts ?? []}
            />}
        </Card>
      </Section>

    </div>
  );
}
