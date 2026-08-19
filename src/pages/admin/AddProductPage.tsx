import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { showToast } from '../../components/ToastContainer';
import { adminService } from '../../services/adminService';

interface FormState {
  name: string; sub: string; description: string; category: string;
  price: string; stock_quantity: string; badge: string;
  ingredients: string; benefits: string;
}

const EMPTY: FormState = {
  name: '', sub: '', description: '', category: 'Skincare',
  price: '', stock_quantity: '', badge: '', ingredients: '', benefits: '',
};

export default function AddProductPage() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm]         = useState<FormState>(EMPTY);
  const [errors, setErrors]     = useState<Partial<FormState & { image: string }>>({});
  const [submitting, setSubmit] = useState(false);

  // Image — two modes: upload file OR paste URL
  const [imgMode, setImgMode]         = useState<'upload' | 'url'>('upload');
  const [pastedUrl, setPastedUrl]     = useState('');
  const [localFile, setLocalFile]     = useState<File | null>(null);
  const [localPreview, setPreview]    = useState('');   // blob URL
  const [uploadedUrl, setUploaded]    = useState('');   // server URL after upload
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);

  // The image URL we'll actually save
  const resolvedImageUrl = imgMode === 'url' ? pastedUrl.trim() : uploadedUrl;

  // ── Field helpers ─────────────────────────────────────────────────────
  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      if (errors[k]) setErrors(er => ({ ...er, [k]: undefined }));
    };

  const fc = (k: keyof FormState) =>
    `w-full bg-transparent border-b py-3 outline-none transition-colors placeholder:text-on-surface/20 ${errors[k] ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`;
  const lc = 'block text-[10px] font-label uppercase tracking-widest text-outline mb-1';

  // ── File handling ─────────────────────────────────────────────────────
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a JPEG, PNG, or WebP image', 'error', 'error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB', 'error', 'error'); return;
    }
    setLocalFile(file);
    setPreview(URL.createObjectURL(file));
    setUploaded('');
    setErrors(er => ({ ...er, image: undefined }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
  }, []);

  const uploadToServer = async () => {
    if (!localFile) return;
    setUploading(true);
    try {
      const result = await adminService.uploadProductImage(localFile);
      setUploaded(result.url);
      showToast('Image uploaded successfully', 'check_circle');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const e: Partial<FormState & { image: string }> = {};
    if (!form.name.trim())        e.name = 'Product name is required';
    if (!form.sub.trim())         e.sub  = 'Subtitle is required';
    if (!form.description.trim()) e.description = 'Description is required';
    const p = Number(form.price.replace(/,/g, ''));
    if (!form.price || isNaN(p) || p <= 0) e.price = 'Enter a valid price';
    const s = Number(form.stock_quantity);
    if (!form.stock_quantity || isNaN(s) || s < 0) e.stock_quantity = 'Enter a valid stock quantity';
    if (!resolvedImageUrl) {
      e.image = imgMode === 'upload'
        ? 'Please upload an image first (or switch to URL mode)'
        : 'Please enter an image URL';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-upload file if selected but not yet uploaded
    if (imgMode === 'upload' && localFile && !uploadedUrl) {
      await uploadToServer();
      if (!uploadedUrl) return; // upload failed — stop
    }

    if (!validate()) return;
    setSubmit(true);
    try {
      await adminService.createProduct({
        name:           form.name.trim(),
        description:    form.description.trim(),
        price:          Number(form.price.replace(/,/g, '')),
        category:       form.category,
        stock_quantity: Number(form.stock_quantity),
        image_url:      resolvedImageUrl,
        sub:            form.sub.trim(),
        badge:          form.badge || undefined,
        ingredients:    form.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        benefits:       form.benefits.split(',').map(s => s.trim()).filter(Boolean),
      });
      showToast(`${form.name} added to catalog!`, 'check_circle');
      navigate('/admin/products');
    } catch (err: any) {
      showToast(err.message || 'Failed to add product', 'error', 'error');
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div className="animate-in fade-in transition-all duration-500 max-w-4xl mx-auto">
      <nav className="mb-8 flex items-center gap-2 text-[10px] text-outline uppercase tracking-widest">
        <Link to="/admin/products" className="hover:text-primary transition-colors">Products</Link>
        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
        <span className="text-tertiary">Add New Product</span>
      </nav>

      <div className="mb-12">
        <h2 className="font-headline text-4xl font-light text-primary mb-3">
          Create New <span className="text-tertiary italic">Masterpiece</span>
        </h2>
        <p className="text-outline max-w-xl leading-relaxed">
          Define the essence of your next luxury offering. Craft the narrative, set the logistics, and curate the visual journey.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <section className="bg-surface-container-low p-8 rounded-xl space-y-8">
          <h3 className="font-headline text-lg text-primary border-b border-outline/10 pb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 group">
              <label className={lc}>Product Name *</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g., Radiance Elixir" className={fc('name')} />
              {errors.name && <p className="text-error text-[11px] mt-1">{errors.name}</p>}
            </div>
            <div className="group">
              <label className={lc}>Subtitle *</label>
              <input value={form.sub} onChange={set('sub')} placeholder="e.g., Brightening Serum" className={fc('sub')} />
              {errors.sub && <p className="text-error text-[11px] mt-1">{errors.sub}</p>}
            </div>
            <div className="group">
              <label className={lc}>Category</label>
              <select value={form.category} onChange={set('category')} className={fc('category')}>
                {['Skincare', 'Lip Care', 'Hair Care', 'Spa Services'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 group">
              <label className={lc}>Description *</label>
              <textarea value={form.description} onChange={set('description')} rows={4}
                placeholder="Describe the botanical journey and skin benefits..."
                className={`${fc('description')} resize-none border border-outline/20 rounded-lg p-4 border-b-0 focus:border-tertiary`} />
              {errors.description && <p className="text-error text-[11px] mt-1">{errors.description}</p>}
            </div>
          </div>
        </section>

        {/* ── Pricing & Stock ─────────────────────────────────────────── */}
        <section className="bg-surface-container-low p-8 rounded-xl space-y-8">
          <h3 className="font-headline text-lg text-primary border-b border-outline/10 pb-4">Pricing & Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group">
              <label className={lc}>Price (XAF) *</label>
              <input value={form.price} onChange={set('price')} placeholder="85000" className={fc('price')} />
              {errors.price && <p className="text-error text-[11px] mt-1">{errors.price}</p>}
              {form.price && !isNaN(Number(form.price.replace(/,/g, ''))) && (
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Displays as: {Number(form.price.replace(/,/g, '')).toLocaleString('fr-CM')} XAF
                </p>
              )}
            </div>
            <div className="group">
              <label className={lc}>Stock Quantity *</label>
              <input value={form.stock_quantity} onChange={set('stock_quantity')} placeholder="50" type="number" min="0" className={fc('stock_quantity')} />
              {errors.stock_quantity && <p className="text-error text-[11px] mt-1">{errors.stock_quantity}</p>}
            </div>
            <div className="group">
              <label className={lc}>Badge (optional)</label>
              <select value={form.badge} onChange={set('badge')} className={fc('badge')}>
                <option value="">None</option>
                {['Best Seller', 'New', 'Premium', 'Limited', 'Sale'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Product Image ────────────────────────────────────────────── */}
        <section className="bg-surface-container-low p-8 rounded-xl space-y-6">
          <h3 className="font-headline text-lg text-primary border-b border-outline/10 pb-4">Product Image</h3>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-outline/20 w-fit">
            {(['upload', 'url'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setImgMode(mode)}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${imgMode === mode ? 'bg-primary text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                {mode === 'upload' ? '⬆ Upload from computer' : '🔗 Paste URL'}
              </button>
            ))}
          </div>

          {/* ── Upload mode ── */}
          {imgMode === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${
                  dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline/30 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileInput} />
                {localPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={localPreview} alt="Preview" className="w-32 h-36 object-cover rounded-xl shadow-md" />
                    <p className="text-xs text-stone-500">{localFile?.name} · {((localFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
                    <p className="text-xs text-primary font-semibold">Click or drop to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[52px] text-stone-300">add_photo_alternate</span>
                    <p className="text-sm font-semibold text-stone-600">Drop an image here, or click to browse</p>
                    <p className="text-xs text-stone-400">JPEG, PNG, WebP, GIF · Max 5 MB</p>
                  </div>
                )}
              </div>

              {/* Upload / success row */}
              {localFile && (
                <div className="flex items-center gap-4">
                  {uploadedUrl ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Image uploaded to server
                    </div>
                  ) : (
                    <button type="button" onClick={uploadToServer} disabled={uploading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100">
                      {uploading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
                        : <><span className="material-symbols-outlined text-sm">cloud_upload</span>Upload to Server</>}
                    </button>
                  )}
                  {!uploadedUrl && (
                    <p className="text-xs text-stone-400">You can also let it upload automatically on submit.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── URL mode ── */}
          {imgMode === 'url' && (
            <div className="space-y-4">
              <div className="group">
                <label className={lc}>Image URL *</label>
                <input value={pastedUrl} onChange={e => { setPastedUrl(e.target.value); setErrors(er => ({ ...er, image: undefined })); }}
                  placeholder="https://example.com/product-photo.jpg"
                  className={`w-full bg-transparent border-b py-3 outline-none transition-colors placeholder:text-on-surface/20 ${errors.image ? 'border-error' : 'border-outline/30 focus:border-tertiary'}`} />
              </div>
              {pastedUrl.trim() && (
                <div className="w-28 h-32 rounded-xl overflow-hidden bg-stone-100">
                  <img src={pastedUrl} alt="URL preview" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
          )}

          {errors.image && (
            <p className="text-error text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>{errors.image}
            </p>
          )}
        </section>

        {/* ── Ingredients & Benefits ───────────────────────────────────── */}
        <section className="bg-surface-container-low p-8 rounded-xl space-y-8">
          <h3 className="font-headline text-lg text-primary border-b border-outline/10 pb-4">Ingredients & Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group">
              <label className={lc}>Key Ingredients (comma-separated)</label>
              <input value={form.ingredients} onChange={set('ingredients')} placeholder="Baobab Extract, Shea Butter, Vitamin E" className={fc('ingredients')} />
              {form.ingredients && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.ingredients.split(',').map(i => i.trim()).filter(Boolean).map(i => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">{i}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="group">
              <label className={lc}>Benefits (comma-separated)</label>
              <input value={form.benefits} onChange={set('benefits')} placeholder="Deep Hydration, Luminous Glow, Anti-Aging" className={fc('benefits')} />
              {form.benefits && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.benefits.split(',').map(b => b.trim()).filter(Boolean).map(b => (
                    <span key={b} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full">{b}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/admin/products"
            className="flex-1 py-4 rounded-xl border border-outline/30 text-center text-sm font-semibold hover:bg-surface-container-low transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || uploading}
            className="flex-1 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl shadow-primary/20 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-3">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : <><span className="material-symbols-outlined text-sm">add</span>Add to Catalog</>}
          </button>
        </div>
      </form>
    </div>
  );
}
