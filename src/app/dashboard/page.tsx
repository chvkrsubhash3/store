'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Package, ShoppingBag, User, LogOut, Bell } from 'lucide-react';

interface Order { id: string; order_number: string; status: string; total_amount: number; created_at: string; }

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));

    const token = localStorage.getItem('accessToken');
    fetch('/api/orders?limit=10', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setOrders(d.data.orders || []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <span className="font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
        </Link>
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-ghost text-sm text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-red to-orange-500 flex items-center justify-center text-white font-bold text-xl">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Order History</h2>
        {loading ? <div className="skeleton h-32 rounded-2xl" /> : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-gray-300">#{o.order_number}</p>
                  <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">₹{o.total_amount?.toLocaleString()}</span>
                  <p className="text-xs text-yellow-400 capitalize">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
