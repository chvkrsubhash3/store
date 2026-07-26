'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Users, ShoppingCart, Package, TrendingUp, CheckCircle, Clock, AlertTriangle, BarChart2, LogOut } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  summary: { totalUsers: number; totalOrders: number; totalRevenue: number; totalProducts: number; totalSellers: number; pendingApprovals: number };
  charts: { revenueChart: any[] };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  useEffect(() => {
    fetch('/api/admin/dashboard', { headers: getHeaders() })
      .then(r => r.json()).then(d => { if (d.success) setData(d.data); });
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetch('/api/admin/users?limit=50', { headers: getHeaders() }).then(r => r.json()).then(d => { if (d.success) setUsers(d.data.users); });
    } else if (activeTab === 'sellers') {
      fetch('/api/admin/sellers?limit=50', { headers: getHeaders() }).then(r => r.json()).then(d => { if (d.success) setSellers(d.data.sellers); });
    } else if (activeTab === 'orders') {
      fetch('/api/admin/orders?limit=50', { headers: getHeaders() }).then(r => r.json()).then(d => { if (d.success) setOrders(d.data.orders); });
    }
  }, [activeTab]);

  const approveSeller = async (id: string, approve: boolean) => {
    await fetch(`/api/admin/sellers/${id}/approve`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ approve })
    });
    setSellers(prev => prev.map(s => s.id === id ? { ...s, is_approved: approve, approval_status: approve ? 'approved' : 'rejected' } : s));
  };

  const banUser = async (id: string, ban: boolean) => {
    await fetch(`/api/admin/users/${id}/ban`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ ban, reason: ban ? 'Policy violation' : null })
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: ban } : u));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sellers', label: 'Sellers', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass-dark border-r border-white/5 flex flex-col min-h-screen">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white">Admin Panel</span>
          </Link>
          <p className="text-xs text-gray-500">SecureMart Administration</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`sidebar-item w-full text-left ${activeTab === item.id ? 'active' : ''}`}>
              <item.icon className="w-5 h-5" />{item.label}
            </button>
          ))}
          <Link href="/soc" className="sidebar-item">
            <AlertTriangle className="w-5 h-5" />SOC Dashboard
          </Link>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="sidebar-item w-full text-left text-red-400">
            <LogOut className="w-5 h-5" />Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && data && (
          <div className="space-y-8">
            <h1 className="page-header">Admin Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Users', value: data.summary.totalUsers, icon: Users, color: 'text-blue-400' },
                { label: 'Total Orders (30d)', value: data.summary.totalOrders, icon: ShoppingCart, color: 'text-green-400' },
                { label: 'Revenue (30d)', value: `₹${data.summary.totalRevenue?.toLocaleString()}`, icon: TrendingUp, color: 'text-yellow-400' },
                { label: 'Active Products', value: data.summary.totalProducts, icon: Package, color: 'text-purple-400' },
                { label: 'Approved Sellers', value: data.summary.totalSellers, icon: CheckCircle, color: 'text-cyan-400' },
                { label: 'Pending Approvals', value: data.summary.pendingApprovals, icon: Clock, color: 'text-orange-400' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</span>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            {data.charts?.revenueChart?.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Revenue (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.charts.revenueChart}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e94560" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#e94560" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e8e8f0' }} formatter={(v: any) => [`₹${v?.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#e94560" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <h1 className="page-header mb-6">User Management</h1>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div><p className="font-medium text-white">{u.first_name} {u.last_name}</p><p className="text-xs text-gray-500">{u.email}</p></div>
                      </td>
                      <td><span className="badge-blue capitalize">{u.role}</span></td>
                      <td>
                        {u.is_banned ? <span className="badge-red">Banned</span> : u.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
                      </td>
                      <td className="text-xs text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                      <td>
                        <button onClick={() => banUser(u.id, !u.is_banned)}
                          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${u.is_banned ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}>
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sellers */}
        {activeTab === 'sellers' && (
          <div>
            <h1 className="page-header mb-6">Seller Management</h1>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Business</th><th>Owner</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {sellers.map(s => (
                    <tr key={s.id}>
                      <td className="font-medium text-white">{s.business_name}</td>
                      <td><p className="text-sm">{s.first_name} {s.last_name}</p><p className="text-xs text-gray-500">{s.email}</p></td>
                      <td>
                        {s.approval_status === 'approved' ? <span className="badge-green">Approved</span>
                          : s.approval_status === 'rejected' ? <span className="badge-red">Rejected</span>
                          : <span className="badge-yellow">Pending</span>}
                      </td>
                      <td>
                        {s.approval_status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => approveSeller(s.id, true)} className="text-xs px-3 py-1 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10">Approve</button>
                            <button onClick={() => approveSeller(s.id, false)} className="text-xs px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div>
            <h1 className="page-header mb-6">Order Management</h1>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Order #</th><th>Customer</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono text-blue-400">{o.order_number}</td>
                      <td>{o.first_name} {o.last_name}</td>
                      <td><span className="text-xs font-semibold capitalize text-yellow-400">{o.status}</span></td>
                      <td><span className="text-xs text-green-400">{o.payment_status}</span></td>
                      <td className="font-semibold">₹{o.total_amount?.toLocaleString()}</td>
                      <td className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
