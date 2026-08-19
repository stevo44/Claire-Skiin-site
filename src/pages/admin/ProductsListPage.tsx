import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useProducts } from '../../store/productStore';
import { showToast } from '../../components/ToastContainer';
import ConfirmModal from './ConfirmModal';

interface EditState {
  name: string;
  price: string;
  stock_quantity: string;
  category: string;
  badge: string;
}

export default function ProductsListPage() {
  const { products, loading, refetch } = useProducts();

  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDelete]   = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Inline edit state
  const [editingId, setEditingId]   = useState<string | number | null>(null);
  const [editState, setEditState]   = useState<EditState | null>(null);
  const [saving, setSaving]         = useState(false);

  const PER_PAGE = 10;

  const categories = useMemo(() =>
    ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter !== 'All') list = list.filter(p => p.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, catFilter, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditState({
      name:           p.name,
      price:          String(p.price),
      stock_quantity: String(p.stock_quantity ?? 50),
      category:       p.category || 'Skincare',
      badge:          p.badge || '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditState(null); };

  const saveEdit = async (id: string | number) => {
    if (!editState) return;
    setSaving(true);
    try {
      await adminService.updateProduct(id, {
        name:           editState.name,
        price:          Number(editState.price),
        stock_quantity: Number(editState.stock_quantity),
        category:       editState.category,
        badge:          editState.badge || null,
      });
      showToast('Product updated', 'check_circle');
      setEditingId(null);
      setEditState(null);
      // ProductStore updates automatically via socket event
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDelete(null);
    try {
      await adminService.deleteProduct(deleteTarget.id);
      showToast(`"${deleteTarget.name}" removed`, 'delete');
      // ProductStore removes it via socket event
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const lowStock = products.filter(p => (p.stock_quantity ?? 50) < 10).length;
  const totalVal = products.reduce((s, p) => s + p.price, 0);

  const ec = (field: keyof EditState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setEditState(prev => prev ? { ...prev, [field]: e.target.value } : prev);

  const inputCls = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors';

  return (
    <div className="animate-in fade-in duration-500">
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete product?"
        message={deleteTarget ? `"${deleteTarget.name}" will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDelete(null)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline text-3xl text-primary mb-1">Product Catalog</h2>
          <p className="text-stone-500 text-sm">Changes here reflect instantly on the frontend via real-time sync.</p>
        </div>
        <Link to="/admin/products/add"
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Products', value: products.length, color: 'text-primary',  icon: 'inventory_2' },
          { label: 'Low Stock',      value: lowStock,        color: 'text-red-600',  icon: 'warning'     },
          { label: 'Catalog Value',  value: `${totalVal.toLocaleString('fr-CM')} XAF`, color: 'text-tertiary', icon: 'payments' },
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center border-b border-stone-100 bg-stone-50/50">
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(c => (
              <button key={c} onClick={() => { setCatFilter(c); setPage(1); }}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap transition-colors ${catFilter === c ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={refetch} className="ml-auto text-stone-400 hover:text-primary transition-colors" title="Refresh">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Product', 'Category', 'Price', 'Stock', 'Badge', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-4 text-[10px] font-label uppercase tracking-widest text-stone-400 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-5 py-4">
                      <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                    </td></tr>
                  ))
                : paginated.length === 0
                ? <tr><td colSpan={6} className="text-center py-16 text-stone-400 text-sm">No products match your filters.</td></tr>
                : paginated.map(p => {
                    const isEditing = editingId === p.id;
                    const isDeleting = deletingId === p.id;
                    const imgSrc = p.img || p.image_url || '';
                    const stock  = p.stock_quantity ?? 50;
                    return (
                      <tr key={p.id} className={`hover:bg-stone-50/60 transition-colors ${isEditing ? 'bg-primary/[0.03]' : ''}`}>
                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                              {imgSrc && <img src={imgSrc} alt={p.name} loading="lazy" className="w-full h-full object-cover" />}
                            </div>
                            {isEditing ? (
                              <input value={editState?.name} onChange={ec('name')} className={`${inputCls} w-48`} />
                            ) : (
                              <div>
                                <p className="text-xs font-semibold">{p.name}</p>
                                <p className="text-[10px] text-stone-400 truncate max-w-[150px]">{p.sub}</p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select value={editState?.category} onChange={ec('category')} className={inputCls}>
                              {['Skincare', 'Lip Care', 'Hair Care', 'Spa Services'].map(c => <option key={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-bold">{p.category}</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input value={editState?.price} onChange={ec('price')} type="number" className={`${inputCls} w-28`} />
                          ) : (
                            <span className="text-xs font-semibold">{p.priceDisplay}</span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input value={editState?.stock_quantity} onChange={ec('stock_quantity')} type="number" min="0" className={`${inputCls} w-20`} />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${stock === 0 ? 'bg-red-500' : stock < 10 ? 'bg-amber-500' : 'bg-green-500'}`} />
                              <span className={`text-xs font-semibold ${stock === 0 ? 'text-red-600' : stock < 10 ? 'text-amber-600' : 'text-on-surface'}`}>
                                {stock} {stock === 0 ? '(out)' : stock < 10 ? '(low)' : ''}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Badge */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select value={editState?.badge} onChange={ec('badge')} className={inputCls}>
                              <option value="">None</option>
                              {['Best Seller', 'New', 'Premium', 'Limited', 'Sale'].map(b => <option key={b}>{b}</option>)}
                            </select>
                          ) : (
                            p.badge ? <span className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-[9px] font-bold uppercase">{p.badge}</span> : <span className="text-stone-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(p.id)} disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                  {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">check</span>}
                                  Save
                                </button>
                                <button onClick={cancelEdit} className="px-3 py-1.5 border border-stone-200 text-stone-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(p)} className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={() => setDelete(p)} disabled={isDeleting}
                                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                                  {isDeleting
                                    ? <span className="w-4 h-4 border-2 border-stone-200 border-t-red-500 rounded-full animate-spin inline-block" />
                                    : <span className="material-symbols-outlined text-[18px]">delete</span>}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-stone-100 flex justify-between items-center">
            <p className="text-[10px] text-stone-400">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} products
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-stone-400 hover:text-primary disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-100'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-stone-400 hover:text-primary disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
