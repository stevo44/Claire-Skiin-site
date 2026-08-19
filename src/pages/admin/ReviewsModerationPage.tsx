import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../components/ToastContainer';
import ConfirmModal from './ConfirmModal';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
type ReportStatus = 'pending' | 'reviewed' | 'dismissed';
type Tab = 'queue' | 'reports';

interface ReviewRow {
  id: number;
  reviewer_email: string;
  product_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  created_at: string;
}

interface ReportRow {
  id: number;
  review_id: number;
  reporter_email: string;
  reason: string;
  status: ReportStatus;
  review_body: string;
  review_rating: number;
  review_status: ReviewStatus;
  created_at: string;
}

const statusBadge = (status: ReviewStatus) => {
  const map: Record<ReviewStatus, string> = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
    hidden:   'bg-stone-100 text-stone-500',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${map[status]}`}>
      {status}
    </span>
  );
};

const Stars = ({ rating }: { rating: number }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={`material-symbols-outlined text-sm ${i <= rating ? 'text-amber-400' : 'text-stone-200'}`}
        style={{ fontVariationSettings: i <= rating ? "'FILL' 1" : "'FILL' 0" }}
      >
        star
      </span>
    ))}
  </span>
);

export default function ReviewsModerationPage() {
  const [tab, setTab] = useState<Tab>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [reviews, setReviews]   = useState<ReviewRow[]>([]);
  const [reports, setReports]   = useState<ReportRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'review' | 'report';
    id: number;
    status: string;
    label: string;
  } | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReviews({ status: statusFilter || undefined });
      setReviews(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load reviews', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReviewReports({ status: 'pending' });
      setReports(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load reports', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'queue') fetchReviews();
    else fetchReports();
  }, [tab, statusFilter]);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'review') {
        await adminService.updateReviewStatus(confirmAction.id, confirmAction.status);
        showToast(`Review ${confirmAction.status}`, 'check_circle');
        fetchReviews();
      } else {
        await adminService.updateReportStatus(confirmAction.id, confirmAction.status);
        showToast(`Report ${confirmAction.status}`, 'check_circle');
        fetchReports();
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error', 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const reportCount  = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="animate-in fade-in duration-500">
      <ConfirmModal
        open={!!confirmAction}
        title={`Confirm action`}
        message={confirmAction
          ? `Set ${confirmAction.type} #${confirmAction.id} to "${confirmAction.status}"?`
          : ''}
        confirmLabel={confirmAction?.label || 'Confirm'}
        cancelLabel="Cancel"
        destructive={['rejected', 'hidden', 'dismissed'].includes(confirmAction?.status || '')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline text-3xl text-primary mb-1">Review Moderation</h2>
          <p className="text-stone-500 text-sm">
            Approve, reject, or hide customer reviews. Investigate reported abuse.
          </p>
        </div>
        <div className="flex gap-2">
          {(['queue', 'reports'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-md'
                  : 'bg-white border border-stone-200 text-stone-500 hover:border-primary/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {t === 'queue' ? 'rate_review' : 'flag'}
              </span>
              {t === 'queue' ? 'Review Queue' : 'Abuse Reports'}
              {t === 'queue' && pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {pendingCount}
                </span>
              )}
              {t === 'reports' && reportCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {reportCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── REVIEW QUEUE TAB ─────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs text-stone-500 uppercase tracking-widest font-semibold">Filter:</span>
            {(['', 'pending', 'approved', 'rejected', 'hidden'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Reviewer', 'Product', 'Rating', 'Review', 'Verified', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-label uppercase tracking-widest text-stone-400 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="px-4 py-3">
                          <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-stone-400 text-sm">
                        No reviews to display.
                      </td>
                    </tr>
                  ) : reviews.map(r => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[120px] truncate">{r.reviewer_email}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-stone-800 max-w-[130px] truncate">{r.product_name}</td>
                      <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[220px]">
                        {r.title && <p className="font-semibold text-stone-700 mb-0.5">"{r.title}"</p>}
                        <p className="line-clamp-2 text-stone-500">{r.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.is_verified_purchase ? (
                          <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            Yes
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-[10px] text-stone-400">
                        {new Date(r.created_at).toLocaleDateString('fr-CM')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status !== 'approved' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'review', id: r.id, status: 'approved', label: 'Approve' })}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="Approve"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                          )}
                          {r.status !== 'rejected' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'review', id: r.id, status: 'rejected', label: 'Reject' })}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Reject"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span>
                            </button>
                          )}
                          {r.status !== 'hidden' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'review', id: r.id, status: 'hidden', label: 'Hide' })}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" title="Hide"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABUSE REPORTS TAB ────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-stone-100 bg-stone-50/50">
              <span className="material-symbols-outlined text-red-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
              <h3 className="font-semibold text-sm text-stone-700">Pending Abuse Reports</h3>
              <span className="ml-auto text-xs text-stone-400">{reports.length} pending</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Reporter', 'Review Excerpt', 'Rating', 'Review Status', 'Reason', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-label uppercase tracking-widest text-stone-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-stone-400 text-sm">
                        No pending reports. All clear! 🎉
                      </td>
                    </tr>
                  ) : reports.map(r => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[130px] truncate">{r.reporter_email}</td>
                      <td className="px-4 py-3 text-xs text-stone-500 max-w-[200px] line-clamp-2">{r.review_body}</td>
                      <td className="px-4 py-3"><Stars rating={r.review_rating} /></td>
                      <td className="px-4 py-3">{statusBadge(r.review_status)}</td>
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[180px]">{r.reason}</td>
                      <td className="px-4 py-3 text-[10px] text-stone-400">
                        {new Date(r.created_at).toLocaleDateString('fr-CM')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConfirmAction({ type: 'report', id: r.id, status: 'reviewed', label: 'Mark Reviewed' })}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                          >
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'report', id: r.id, status: 'dismissed', label: 'Dismiss' })}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-bold hover:bg-stone-200 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
