'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Search, ShoppingCart, LogOut } from 'lucide-react';

interface Product {
  id: string; name: string; slug: string; price: number; compare_price: number;
  thumbnail_url: string; rating: number; total_reviews: number; brand: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { if (data.success) setProducts(data.data.products); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <span className="font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/cart" className="btn-ghost"><ShoppingCart className="w-5 h-5" /></Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="flex items-center gap-2 btn-ghost text-sm py-1.5 px-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-red to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                  {user.firstName?.[0] || 'U'}
                </div>
                <span className="text-white font-medium text-xs">{user.firstName}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost text-xs text-red-400 px-2 py-1" title="Sign Out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link href="/auth/login" className="btn-primary text-sm px-4 py-2">Sign In</Link>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">All Products</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} className="card-product group block">
                <div className="aspect-square bg-gray-800 overflow-hidden">
                  <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">{p.brand}</p>
                  <h2 className="text-sm font-medium text-white mb-2 line-clamp-2">{p.name}</h2>
                  <span className="text-lg font-bold text-white">₹{p.price?.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
