import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../components/ToastContainer';
import { authService } from '../services/authService';
import PasswordChecklist from '../components/PasswordChecklist';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [allValid, setAllValid] = useState(false);
  const [loading, setLoading] = useState(false);

  // If there's no token in the URL, redirect to forgot-password.
  useEffect(() => {
    if (!token) {
      showToast('Invalid reset link. Please request a new one.', 'error', 'error');
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      showToast('Password reset successfully! Please sign in.', 'check_circle', 'success');
      navigate('/login', { replace: true });
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to reset password. The link may have expired.', 'error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 bg-surface">
      <div className="w-full max-w-md bg-surface-lowest rounded-[2rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl font-bold text-primary">Claire Skiin</Link>
          <h1 className="text-3xl font-serif text-on-surface mt-6 mb-2">Set New Password</h1>
          <p className="text-on-surface-variant text-sm">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group pt-2">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">
              New Password *
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

          {/* Reusable checklist — same component as RegisterPage */}
          <PasswordChecklist
            password={password}
            confirmPassword={confirmPassword}
            onValidChange={setAllValid}
          />

          <div className="pt-4">
            <button type="submit" disabled={loading || !allValid}
              className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting…</>
                : 'Reset Password'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          <Link to="/login" className="text-primary font-bold hover:text-tertiary transition-colors">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
