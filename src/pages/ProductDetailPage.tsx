import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { useProducts } from '../store/productStore';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/ToastContainer';
import PageMeta from '../components/PageMeta';
import { ProductDetailSkeleton, FetchError } from '../components/SkeletonCard';
import { eventService } from '../services/eventService';
import { reviewService, ReviewItem } from '../services/reviewService';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, state, toggleWishlist } = useCart();
  const { getById, loading: storeLoading } = useProducts();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);

  // ── Review state ─────────────────────────────────────────────────────────
  const [reviewData, setReviewData] = useState<{
    reviews: ReviewItem[];
    aggregate: { average_rating: number; review_count: number };
    userReview: ReviewItem | null;
  } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');

  const product = id ? getById(id) : undefined;

  const fetchReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const data = await reviewService.getProductReviews(id);
      setReviewData(data);
    } catch {
      // Non-fatal — reviews section just stays empty
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setQty(1);
    setActiveThumb(0);
    setReviewData(null);
    if (product) {
      eventService.trackProductView(Number(product.id), { name: product.name, category: product.category, price: product.price });
      fetchReviews();
    }
  }, [id, product?.id]);

  const inWishlist = product ? state.wishlist.includes(Number(product.id)) : false;

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) addToCart({ ...product, id: Number(product.id) } as any);
    showToast(`${product.name} added to bag`, 'shopping_bag');
    eventService.trackAddToCart(Number(product.id), { name: product.name, category: product.category, price: product.price, quantity: qty });
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    const success = await toggleWishlist(Number(product.id));
    if (!success && !localStorage.getItem('token')) {
      navigate('/login');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (reviewForm.body.trim().length < 10) {
      showToast('Review must be at least 10 characters.', 'error', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewService.submitReview(id, {
        rating: reviewForm.rating,
        title: reviewForm.title.trim() || undefined,
        body: reviewForm.body.trim(),
      });
      // Track review submission — product_id and rating only (no body text)
      eventService.trackReviewSubmission(id, reviewForm.rating);
      showToast('Review submitted — it will appear after moderation.', 'check_circle');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', body: '' });
      fetchReviews();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Submission failed.', 'error', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReport = async (reviewId: number) => {
    if (reportReason.trim().length < 5) {
      showToast('Reason must be at least 5 characters.', 'error', 'error');
      return;
    }
    try {
      await reviewService.reportReview(reviewId, reportReason);
      showToast('Review flagged for moderation.', 'check_circle');
      setReportingId(null);
      setReportReason('');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Report failed.', 'error', 'error');
    }
  };

  const thumbFilters = [{ filter: 'none' }, { filter: 'hue-rotate(30deg)' }, { filter: 'saturate(0.6)' }];
  const imgSrc = product?.img || product?.image_url || '';

  if (storeLoading) return (
    <div className="pt-[100px] bg-surface min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-16 py-4">
        <ProductDetailSkeleton />
      </div>
    </div>
  );

  if (!product) return (
    <div className="pt-[100px] bg-surface min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-16">
        <FetchError
          message="We couldn't find this product. It may have been removed."
          onRetry={() => navigate('/shop')}
        />
      </div>
    </div>
  );

  const recommended = useProducts().products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);

  return (
    <>
      <PageMeta title={product.name} description={product.description || 'Luxury botanical skincare from Claire Skiin.'} ogImage={imgSrc} ogType="product" />
      <div className="pt-[100px] bg-surface min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[0.75rem] text-outline mb-12 uppercase tracking-[0.15em]">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link to="/shop" className="hover:text-primary transition-colors">{product.category}</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-tertiary">{product.name}</span>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-12 lg:gap-20 items-start">
            {/* Images */}
            <div className="flex gap-4 reveal-left">
              <div className="flex flex-col gap-3">
                {thumbFilters.map((t, i) => (
                  <div key={i}
                    className={`w-[72px] h-[86px] rounded-[10px] overflow-hidden cursor-pointer border-2 transition-all ${activeThumb === i ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                    onClick={() => setActiveThumb(i)}>
                    {imgSrc && <img src={imgSrc} alt={`${product.name} view ${i + 1}`} loading="lazy" className="w-full h-full object-cover" style={{ filter: t.filter }} />}
                  </div>
                ))}
              </div>
              <div className="flex-1 aspect-[4/5] rounded-[20px] overflow-hidden bg-surface-container-low relative group">
                {imgSrc && <img src={imgSrc} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: thumbFilters[activeThumb].filter }} />}
              </div>
            </div>

            {/* Info */}
            <div className="reveal-right">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5 text-tertiary">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: i <= Math.round(reviewData?.aggregate.average_rating ?? 4.8) ? "'FILL' 1" : "'FILL' 0" }}>
                        star
                      </span>
                    ))}
                  </div>
                  <span className="text-[0.75rem] tracking-[0.15em] uppercase text-outline">
                    {reviewsLoading
                      ? '...' 
                      : reviewData
                        ? `${reviewData.aggregate.average_rating.toFixed(1)} (${reviewData.aggregate.review_count} review${reviewData.aggregate.review_count !== 1 ? 's' : ''})`
                        : '4.8 (124 reviews)'}
                  </span>
                </div>
              <h1 className="font-serif text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.2] my-4">{product.name}</h1>
              <div className="font-serif text-[2rem] font-bold text-primary mb-6">{product.priceDisplay}</div>
              <p className="text-[0.95rem] text-on-surface-variant leading-[1.8] mb-6">{product.description}</p>

              {(product.ingredients?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {(product.ingredients || []).map(ing => (
                    <span key={ing} className="px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant text-[0.72rem] text-on-surface-variant font-medium">{ing}</span>
                  ))}
                </div>
              )}

              {/* Stock warning */}
              {(product.stock_quantity ?? 50) < 10 && (
                <div className="mb-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Only {product.stock_quantity} left in stock — order soon!
                </div>
              )}

              <div className="flex gap-4 items-center mt-6">
                <div className="flex items-center border border-outline-variant rounded-full overflow-hidden w-fit">
                  <button className="w-11 h-11 bg-transparent hover:bg-surface-container-low hover:text-primary text-xl text-secondary transition-colors" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <span className="min-w-[48px] text-center font-semibold text-[1rem]">{qty}</span>
                  <button className="w-11 h-11 bg-transparent hover:bg-surface-container-low hover:text-primary text-xl text-secondary transition-colors" onClick={() => setQty(Math.min(10, qty + 1))}>+</button>
                </div>
                <button
                  className="flex-1 p-[18px] bg-gradient-to-br from-primary to-primary-container text-white rounded-[14px] text-[0.75rem] font-bold tracking-[0.2em] uppercase cursor-pointer transition-all hover:-translate-y-[2px] shadow-[0_8px_24px_rgba(0,108,12,0.3)] hover:shadow-[0_16px_36px_rgba(0,108,12,0.4)] active:scale-95"
                  onClick={handleAddToCart}>
                  Add to Shopping Bag
                </button>
                <button
                  className={`w-[52px] h-[52px] border-[1.5px] rounded-full flex items-center justify-center transition-all duration-300 ${inWishlist ? 'bg-red-100 border-red-300 text-red-500' : 'bg-transparent border-outline-variant text-outline hover:bg-red-100 hover:border-red-300 hover:text-red-500'}`}
                  onClick={handleToggleWishlist}>
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                </button>
              </div>
              <p className="text-[0.78rem] text-center text-outline italic mt-3">Complimentary signature gift wrapping included.</p>

              {(product.benefits?.length ?? 0) > 0 && (
                <div className="mt-8 pt-8 border-t border-outline-variant">
                  <h3 className="font-serif text-[1.25rem] font-bold mb-5 pb-2 border-b border-outline-variant/30">The Ritual Benefits</h3>
                  {(product.benefits || []).map((b, i) => (
                    <div key={i} className="flex gap-4 items-start mb-5">
                      <div className="w-11 h-11 bg-tertiary-fixed rounded-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-tertiary">flare</span>
                      </div>
                      <div>
                        <h4 className="text-[0.8rem] font-bold uppercase tracking-[0.1em] mb-1">{b}</h4>
                        <p className="text-[0.82rem] text-on-surface-variant leading-[1.6]">Nature-powered formula for visible results in days.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="py-16 mt-8 border-t border-outline-variant/30 reveal">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="text-[0.65rem] font-bold tracking-[0.3em] uppercase text-primary block mb-2">Customer Reviews</span>
                <h2 className="font-serif text-[1.75rem] font-bold">
                  What Our <em className="text-tertiary italic">Clients Say</em>
                </h2>
              </div>
              {user && !reviewData?.userReview && (
                <button
                  onClick={() => setShowReviewForm(v => !v)}
                  className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Write a Review
                </button>
              )}
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 border border-outline-variant text-outline px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  Login to Review
                </button>
              )}
            </div>

            {/* Review submission form */}
            {showReviewForm && user && (
              <form onSubmit={handleSubmitReview} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 mb-8 space-y-4">
                <h3 className="font-serif text-[1.1rem] font-bold">Share Your Experience</h3>
                {/* Rating selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-2">Your Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                        className="transition-transform hover:scale-110">
                        <span className="material-symbols-outlined text-2xl text-tertiary"
                          style={{ fontVariationSettings: star <= reviewForm.rating ? "'FILL' 1" : "'FILL' 0" }}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-1">Headline (optional)</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Transformed my skin in 2 weeks"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-1">Your Review *</label>
                  <textarea
                    rows={4}
                    value={reviewForm.body}
                    onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Describe your experience with this product..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
                    required
                    minLength={10}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowReviewForm(false)}
                    className="flex-1 py-3 border border-outline-variant text-outline rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingReview}
                    className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                    {submittingReview && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* User's own review (pending/rejected) */}
            {reviewData?.userReview && reviewData.userReview.status !== 'approved' && (
              <div className="mb-6 p-4 border border-amber-200 bg-amber-50 rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">Your Review (Pending Approval)</p>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="material-symbols-outlined text-sm text-amber-400"
                      style={{ fontVariationSettings: i <= reviewData.userReview!.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  ))}
                </div>
                {reviewData.userReview.title && <p className="font-semibold text-sm mb-1">{reviewData.userReview.title}</p>}
                <p className="text-sm text-on-surface-variant">{reviewData.userReview.body}</p>
              </div>
            )}

            {/* Approved reviews list */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-surface-container-low rounded-2xl animate-pulse" />)}
              </div>
            ) : reviewData && reviewData.reviews.filter(r => r.status === 'approved').length === 0 ? (
              <div className="text-center py-12 text-outline">
                <span className="material-symbols-outlined text-[40px] mb-3 block opacity-30">rate_review</span>
                <p className="text-sm">No approved reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {reviewData?.reviews.filter(r => r.status === 'approved').map(review => (
                  <div key={review.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex gap-0.5 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className="material-symbols-outlined text-sm text-tertiary"
                              style={{ fontVariationSettings: i <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          ))}
                        </div>
                        <p className="text-[0.7rem] text-outline">
                          {review.reviewer_email.split('@')[0].replace(/./g, (c, i) => i > 2 ? (i === review.reviewer_email.split('@')[0].length - 1 ? c : '*') : c)}
                          &nbsp;·&nbsp;
                          {new Date(review.created_at).toLocaleDateString('en-CM', { year: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {review.is_verified_purchase && (
                          <span className="flex items-center gap-1 text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            Verified
                          </span>
                        )}
                        {user && user.id !== review.user_id && (
                          reportingId === review.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={reportReason}
                                onChange={e => setReportReason(e.target.value)}
                                placeholder="Reason for report..."
                                className="border border-outline-variant rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                              />
                              <button onClick={() => handleReport(review.id)}
                                className="text-[10px] font-bold text-red-600 hover:underline">Send</button>
                              <button onClick={() => { setReportingId(null); setReportReason(''); }}
                                className="text-[10px] text-outline hover:underline">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReportingId(review.id)}
                              className="p-1 text-outline hover:text-red-500 transition-colors"
                              title="Report review"
                            >
                              <span className="material-symbols-outlined text-[14px]">flag</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    {review.title && <h4 className="font-semibold text-[0.9rem] mb-1">{review.title}</h4>}
                    <p className="text-[0.85rem] text-on-surface-variant leading-[1.7]">{review.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended */}
          {recommended.length > 0 && (
            <div className="py-16 mt-8 border-t border-outline-variant/30 reveal">
              <div className="mb-8">
                <span className="text-[0.65rem] font-bold tracking-[0.3em] uppercase text-primary block mb-2">Curated for You</span>
                <h2 className="font-serif text-[2rem] font-bold">The Perfect <em className="text-tertiary italic">Complement</em></h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recommended.map(p => (
                  <div key={p.id} className="bg-surface-container-lowest rounded-[20px] overflow-hidden cursor-pointer transition-all hover:-translate-y-[6px] hover:shadow-[0_24px_60px_rgba(0,0,0,0.10)] group" onClick={() => navigate(`/product/${p.id}`)}>
                    <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
                      {p.badge && <span className="absolute top-4 left-4 bg-tertiary text-white text-[0.6rem] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full z-10">{p.badge}</span>}
                      {(p.img || p.image_url) && <img loading="lazy" src={p.img || p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-[1.08]" />}
                    </div>
                    <div className="p-5 pb-6">
                      <p className="text-[0.6rem] font-bold tracking-[0.25em] uppercase text-tertiary mb-[0.4rem]">{p.category}</p>
                      <h3 className="font-serif text-[1.1rem] font-semibold text-on-surface mb-2 leading-[1.3]">{p.name}</h3>
                      <p className="font-serif text-[1.1rem] font-bold text-on-surface">{p.priceDisplay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
