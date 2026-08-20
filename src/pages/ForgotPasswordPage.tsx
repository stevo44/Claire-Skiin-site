import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../components/ToastContainer';
import { authService } from '../services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      // Always show the same message — backend returns a generic response
      // even for unknown emails to prevent user enumeration.
      setSent(true);
    } catch (err: any) {
      // The backend returns 200 even for non-existent emails, but if the
      // network fails or the server is down we should show an error.
      showToast(err?.response?.data?.message || 'Something went wrong. Please try again.', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 bg-surface">
      <div className="w-full max-w-md bg-surface-lowest rounded-[2rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl font-bold text-primary">Claire Skiin</Link>
          <h1 className="text-3xl font-serif text-on-surface mt-6 mb-2">Reset Password</h1>
          <p className="text-on-surface-variant text-sm">Enter your email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
              <span className="material-symbols-outlined text-[32px] text-green-700">mark_email_read</span>
              <p className="text-sm text-green-800 mt-2 leading-relaxed">
                If that email address is active in our system, you will receive a password reset link shortly.
              </p>
            </div>
            <p className="text-sm text-on-surface-variant">
              Check your inbox (and spam folder) for the reset link.
            </p>
            <Link to="/login"
              className="inline-block px-8 py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold tracking-widest uppercase hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group pt-2">
              <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
                Email Address *
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-transparent border-b border-outline-variant/30 py-2 mt-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors text-sm" />
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                  : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Remember your password?{' '}
          <Link to="/login" className="text-primary font-bold hover:text-tertiary transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
