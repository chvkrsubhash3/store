'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', phone: '', role: 'customer',
  });

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message); return; }

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        const role = data.data.user.role;
        if (['admin', 'super_admin'].includes(role)) window.location.href = '/admin';
        else if (role === 'soc_analyst') window.location.href = '/soc';
        else window.location.href = '/';

      } else {
        if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone, role: form.role }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message); return; }
        setSuccess('Account created! Signing in...');
        setTimeout(() => { setMode('login'); }, 2000);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize ${mode === 'login' ? 'bg-brand-red text-white' : 'text-gray-400'}`}>Sign In</button>
            <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize ${mode === 'register' ? 'bg-brand-red text-white' : 'text-gray-400'}`}>Sign Up</button>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="text-gray-400 text-sm mb-6">{mode === 'login' ? 'Sign in to SecureMart' : 'Join millions of shoppers on SecureMart'}</p>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl mb-4">{error}</div>}
          {success && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <input required type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="First Name" className="input" />
                <input required type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Last Name" className="input" />
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" className="input" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" className="input pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Confirm Password</label>
                <input required type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="••••••••" className="input" />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-4">
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 p-4 bg-white/3 border border-white/5 rounded-xl text-center text-xs text-gray-500 font-mono">
              🧪 Test: customer@securemart.local / SecureMart@123
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
