import React, { useState } from 'react';
import { useAuthContext } from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import { showToast } from '../components/ToastContainer';

export default function RegisterPage() {
  const { register, loading, error } = useAuthContext();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return; }
    try {
      await register({
        email,
        password,
        full_name: fullName,
        whatsapp_number: whatsappNumber.trim() || undefined,
      });
      showToast('Account created! Please sign in.', 'check_circle');
      navigate('/login');
    } catch (err) {
      // error displayed from context
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 bg-surface">
      <div className="w-full max-w-md bg-surface-lowest rounded-[2rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl font-bold text-primary">Claire Skiin</Link>
          <h1 className="text-3xl font-serif text-on-surface mt-6 mb-2">Join the Sanctuary.</h1>
          <p className="text-on-surface-variant text-sm">Create your account and begin your ritual.</p>
        </div>

        {displayError && (
          <div className="mb-6 p-4 bg-error/10 text-error text-xs tracking-widest uppercase font-bold text-center rounded-xl">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              Full Name *
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm" />
          </div>

          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              Email Address *
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm" />
          </div>

          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              WhatsApp Number (Optional)
            </label>
            <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+237 6xx xxx xxx"
              className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm placeholder:text-stone-300 placeholder:text-xs" />
            <p className="text-[10px] text-stone-400 mt-1">Used by admin to send instant order & appointment updates via WhatsApp.</p>
          </div>

          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              Password *
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm" />
          </div>

          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              Confirm Password *
            </label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm" />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Account...</>
                : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:text-tertiary transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
