/**
 * pages/admin/UsersPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production client registry.
 * • Fetches from API with graceful fallback
 * • Socket: new user registrations appear in real time
 * • User detail drawer on row click
 * • Filter by tier, search by name/email
 * • Export client list as CSV
 */
import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { io } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  phone?: string;
  tier?: string;
  total_spent?: number;
  status?: 'active' | 'inactive';
  isNew?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_USERS: AdminUser[] = [
  { id: 'usr-001', full_name: 'Amara Okafor',       email: 'amara.o@icloud.com',     phone: '+237 670 11 22 33', tier: 'Inner Circle', total_spent: 850000,  created_at: '2024-01-15T00:00:00Z', status: 'active'   },
  { id: 'usr-002', full_name: "Samuel Eto'o Jr",     email: 's.etoo@prestige.cm',     phone: '+237 699 00 11 22', tier: 'Retail',       total_spent: 245500,  created_at: '2023-12-05T00:00:00Z', status: 'active'   },
  { id: 'usr-003', full_name: 'Marie-Claire Abena',  email: 'abena.claire@wellness.org', phone: '+237 655 44 33 22', tier: 'Inner Circle', total_spent: 1200000, created_at: '2023-11-20T00:00:00Z', status: 'active' },
  { id: 'usr-004', full_name: 'Daniel Ngassa',       email: 'daniel.ng@fintech.cm',   phone: '+237 680 77 88 99', tier: 'Loyalty II',   total_spent: 420000,  created_at: '2023-10-08T00:00:00Z', status: 'inactive' },
  { id: 'usr-005', full_name: 'Fatima Bello',        email: 'fatima.b@mail.cm',       phone: '+237 677 55 44 33', tier: 'Retail',       total_spent: 95000,   created_at: '2023-09-12T00:00:00Z', status: 'active'   },
];

const TIER_STYLES: Record<string, string> = {
  'Inner Circle': 'bg-amber-50 text-amber-700 border border-amber-100',
  'Loyalty II':   'bg-blue-50 text-blue-700 border border-blue-100',
  'Retail':       'bg-stone-100 text-stone-600 border border-stone-200',
};

const TIER_ICONS: Record<string, string> = {
  'Inner Circle': 'workspace_premium',
  'Loyalty II':   'star',
  'Retail':       'person',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fmt = (n: number) => n.toLocaleString('fr-CM');

const exportCSV = (users: AdminUser[]) => {
  const headers = ['Name', 'Email', 'Phone', 'Tier', 'Lifetime Spend (XAF)', 'Joined', 'Status'];
  const rows = users.map(u => [
    u.full_name, u.email, u.phone ?? '', u.tier ?? 'Retail',
    u.total_spent ?? 0, fmtDate(u.created_at), u.status ?? 'active',
  ]);
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'inactive'>('All');
  const [selected, setSelected]   = useState<AdminUser | null>(null);
  const [newCount, setNewCount]   = useState(0);

  // ── Fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    adminService.getUsers()
      .then((data: any) => setUsers(data.users ?? (Array.isArray(data) ? data : FALLBACK_USERS)))
      .catch(() => setUsers(FALLBACK_USERS))
      .finally(() => setLoading(false));
  }, []);

  // ── Socket: new user registrations ────────────────────────────────
  useEffect(() => {
    const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });

    socket.on('user:registered', (user: AdminUser) => {
      setUsers(prev => [{ ...user, isNew: true }, ...prev]);
      setNewCount(c => c + 1);
      setTimeout(() => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isNew: false } : u)), 4000);
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────
  const tiers = ['All', ...Array.from(new Set(users.map(u => u.tier || 'Retail')))];

  const filtered = useMemo(() => {
    let list = users;
    if (tierFilter !== 'All')      list = list.filter(u => u.tier === tierFilter);
    if (statusFilter !== 'All')    list = list.filter(u => (u.status ?? 'active') === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q)
      );
    }
    return list;
  }, [users, tierFilter, statusFilter, search]);

  // ── Stats ──────────────────────────────────────────────────────────
  const totalSpend    = users.reduce((s, u) => s + (u.total_spent || 0), 0);
  const activeCount   = users.filter(u => (u.status ?? 'active') === 'active').length;
  const avgSpend      = users.length ? Math.round(totalSpend / users.length) : 0;
  const innerCircle   = users.filter(u => u.tier === 'Inner Circle').length;

  return (
    <div className="animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-tertiary font-bold mb-2 block">Boutique Directory</span>
          <h2 className="font-headline text-4xl text-on-surface">
            Client <span className="text-tertiary italic">Registry</span>
          </h2>
          <p className="text-stone-500 text-sm mt-1 flex items-center gap-2">
            A curated overview of all registered patrons.
            {newCount > 0 && (
              <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {newCount} new
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-500 hover:border-primary hover:text-primary transition-colors bg-white"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Clients',    value: users.length,       sub: 'Registered patrons',      icon: 'group',             color: 'bg-blue-50 text-blue-700'    },
          { label: 'Active Members',   value: activeCount,         sub: 'Currently engaged',       icon: 'person_check',      color: 'bg-green-50 text-green-700'  },
          { label: 'Inner Circle',     value: innerCircle,         sub: 'Premium tier members',    icon: 'workspace_premium', color: 'bg-amber-50 text-amber-700'  },
          { label: 'Avg Lifetime Value', value: `${fmt(avgSpend)} XAF`, sub: 'Per client',         icon: 'payments',          color: 'bg-primary/10 text-primary'  },
        ].map(s => (
          <div key={s.label} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <span className="material-symbols-outlined text-lg">{s.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">{s.label}</p>
              <p className="font-headline text-xl font-bold text-on-surface leading-tight">{s.value}</p>
              <p className="text-[10px] text-stone-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b border-stone-100 bg-stone-50/50">
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email or phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-stone-200 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {tiers.map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap transition-colors ${tierFilter === t ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}>
                {t}
              </button>
            ))}
            <div className="w-px bg-stone-200 self-stretch mx-1" />
            {(['All', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-100">
                {['Client', 'Contact', 'Member Since', 'Tier', 'Lifetime Spend', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading
                ? Array(4).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-6 py-4">
                      <div className="h-12 bg-stone-100 rounded-lg animate-pulse" />
                    </td></tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr><td colSpan={6} className="text-center py-16">
                      <span className="material-symbols-outlined text-stone-200 text-5xl block mb-3">group</span>
                      <p className="text-stone-400 font-bold">No clients found</p>
                    </td></tr>
                  )
                  : filtered.map(user => (
                    <tr
                      key={user.id}
                      className={`group cursor-pointer transition-all duration-500 ${user.isNew ? 'bg-primary/5' : 'hover:bg-stone-50/50'}`}
                      onClick={() => setSelected(user)}
                    >
                      {/* Client */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} loading="lazy"
                              className="w-10 h-10 rounded-full object-cover border border-stone-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/10">
                              {getInitials(user.full_name)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-on-surface">{user.full_name}</p>
                            {user.isNew && (
                              <span className="text-[9px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-6 py-5">
                        <p className="text-xs text-on-surface">{user.email}</p>
                        {user.phone && <p className="text-[10px] text-stone-400 mt-0.5">{user.phone}</p>}
                      </td>
                      {/* Joined */}
                      <td className="px-6 py-5 text-xs text-stone-500 whitespace-nowrap">
                        {fmtDate(user.created_at)}
                      </td>
                      {/* Tier */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${TIER_STYLES[user.tier || ''] || 'bg-stone-100 text-stone-600'}`}>
                          <span className="material-symbols-outlined text-[12px]">{TIER_ICONS[user.tier || ''] || 'person'}</span>
                          {user.tier || 'Retail'}
                        </span>
                      </td>
                      {/* Spend */}
                      <td className="px-6 py-5 font-semibold text-sm whitespace-nowrap">
                        {fmt(user.total_spent || 0)} XAF
                      </td>
                      {/* Status */}
                      <td className="px-6 py-5">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit ${user.status === 'inactive' ? 'text-stone-400' : 'text-green-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.status === 'inactive' ? 'bg-stone-300' : 'bg-green-500'}`} />
                          {user.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/30">
          <p className="text-[10px] text-stone-400">
            Showing {filtered.length} of {users.length} clients · Total lifetime value: <strong>{fmt(totalSpend)} XAF</strong>
          </p>
        </div>
      </div>

      {/* ── User Detail Drawer ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

            {/* Drawer header */}
            <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Client Profile</p>
                <h3 className="font-headline text-xl">{selected.full_name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-stone-100 rounded-full text-stone-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Avatar + tier */}
              <div className="flex flex-col items-center text-center gap-3 py-4">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt={selected.full_name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/10" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {getInitials(selected.full_name)}
                  </div>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${TIER_STYLES[selected.tier || ''] || 'bg-stone-100 text-stone-600'}`}>
                  <span className="material-symbols-outlined text-sm">{TIER_ICONS[selected.tier || ''] || 'person'}</span>
                  {selected.tier || 'Retail'} Member
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {[
                  { label: 'Email',          value: selected.email,                    icon: 'mail' },
                  { label: 'Phone',          value: selected.phone || '—',             icon: 'call' },
                  { label: 'Member Since',   value: fmtDate(selected.created_at),      icon: 'calendar_today' },
                  { label: 'Account Status', value: selected.status || 'active',       icon: 'person_check' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 py-3 border-b border-stone-50">
                    <span className="material-symbols-outlined text-stone-300 text-lg">{row.icon}</span>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">{row.label}</p>
                      <p className="text-sm font-semibold text-on-surface capitalize">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Spend */}
              <div className="bg-primary/5 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Lifetime Spend</p>
                <p className="font-headline text-3xl font-bold text-primary">{fmt(selected.total_spent || 0)}</p>
                <p className="text-xs text-stone-400">XAF</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
