import React, { useState } from 'react';
import { useAuthContext } from '../store/authStore';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { showToast } from '../components/ToastContainer';

export default function LoginPage() {
  const { login, loading, error } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login({ email, password });
      const firstName = data.user?.full_name?.split(' ')[0] || '';
      showToast(`Welcome back${firstName ? ', ' + firstName : ''}!`, 'check_circle');
      navigate(data.user?.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      // error displayed from context
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 bg-surface">
      <div className="w-full max-w-md bg-surface-lowest rounded-[2rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl font-bold text-primary">Claire Skiin</Link>
          <h1 className="text-3xl font-serif text-on-surface mt-6 mb-2">Welcome Back.</h1>
          <p className="text-on-surface-variant text-sm">Sign in to uncover your natural rituals.</p>
        </div>

        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-1">Dev Mode</p>
          <p className="text-xs text-amber-600">Admin: <span className="font-mono">admin@claireskiin.cm</span> / <span className="font-mono">admin123</span></p>
          <p className="text-xs text-amber-600">User: any email / any password (6+ chars)</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error/10 text-error text-xs tracking-widest uppercase font-bold text-center rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative group pt-4">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-3 mt-4 text-on-surface focus:outline-none focus:border-tertiary transition-colors" />
          </div>
          <div className="relative group pt-4">
            <label className="text-[10px] tracking-widest uppercase font-bold text-on-surface-variant absolute top-0 left-0 transition-colors group-focus-within:text-tertiary">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-transparent border-b border-outline-variant/30 py-3 mt-4 text-on-surface focus:outline-none focus:border-tertiary transition-colors" />
          </div>
          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing In...</>
                : 'Sign In'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-bold hover:text-tertiary transition-colors">Create an Account</Link>
        </p>
      </div>
    </div>
  );
}
