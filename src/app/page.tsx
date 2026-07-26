'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ShoppingCart, Shield, Truck, Star, ArrowRight, Search, ChevronRight, Zap, LogOut, User } from 'lucide-react';

const heroSlides = [
  {
    title: 'Fresh Groceries',
    subtitle: 'Delivered to your door',
    desc: 'Farm-fresh fruits, vegetables, dairy and more. Order before 12 PM for same-day delivery.',
    cta: 'Shop Groceries',
    href: '/products?category=fruits-vegetables',
    badge: '🌿 Organic',
    bg: 'from-emerald-900/40 to-teal-900/40',
  },
  {
    title: 'Latest Electronics',
    subtitle: 'Tech at unbeatable prices',
    desc: 'Smartphones, laptops, smart gadgets and accessories from top brands.',
    cta: 'Shop Electronics',
    href: '/products?category=electronics',
    badge: '⚡ Flash Sale',
    bg: 'from-blue-900/40 to-cyan-900/40',
  },
  {
    title: 'Healthcare & Pharmacy',
    subtitle: 'Your health, our priority',
    desc: 'Medicines, health monitors, vitamins and personal care products delivered fast.',
    cta: 'Shop Pharmacy',
    href: '/products?category=pharmacy',
    badge: '💊 Rx Available',
    bg: 'from-purple-900/40 to-pink-900/40',
  },
];

const categories = [
  { name: 'Fruits & Veg', slug: 'fruits-vegetables', icon: '🍎', color: 'from-green-600 to-emerald-700' },
  { name: 'Dairy', slug: 'dairy', icon: '🥛', color: 'from-blue-600 to-sky-700' },
  { name: 'Electronics', slug: 'electronics', icon: '📱', color: 'from-purple-600 to-violet-700' },
  { name: 'Pharmacy', slug: 'pharmacy', icon: '💊', color: 'from-red-600 to-rose-700' },
  { name: 'Fashion', slug: 'fashion', icon: '👕', color: 'from-pink-600 to-fuchsia-700' },
  { name: 'Pet Store', slug: 'pet-food', icon: '🐶', color: 'from-orange-600 to-amber-700' },
  { name: 'Plants', slug: 'plants-gardening', icon: '🌱', color: 'from-teal-600 to-cyan-700' },
  { name: 'Pickles', slug: 'pickles-homemade', icon: '🥒', color: 'from-yellow-600 to-orange-700' },
];

interface Product {
  id: string; name: string; price: number; compare_price: number;
  thumbnail_url: string; rating: number; total_reviews: number;
  category_name: string; slug: string; brand: string;
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/products?featured=true&limit=8&approved=true')
      .then(r => r.json())
      .then(data => { if (data.success) setFeaturedProducts(data.data?.products || []); })
      .catch(() => {});
  }, []);

  const slide = heroSlides[currentSlide];

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
            </Link>

            <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) window.location.href = `/products?q=${encodeURIComponent(searchQuery)}`; }} className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands, categories..." className="input pl-10"
                />
              </div>
            </form>

            <div className="flex items-center gap-3 ml-auto">
              <Link href="/soc" className="btn-secondary text-xs px-3 py-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10">SOC Dashboard</Link>
              <Link href="/admin" className="btn-secondary text-xs px-3 py-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">Admin</Link>

              {user ? (
                <div className="flex items-center gap-2 border-l border-white/10 pl-3">
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={`bg-gradient-to-br ${slide.bg} via-gray-900/60 to-[#0a0a0f] py-16 md:py-24`}>
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">{slide.badge}</span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{slide.title}<br/><span className="text-gradient">{slide.subtitle}</span></h1>
            <p className="text-gray-400 mb-8 max-w-lg">{slide.desc}</p>
            <div className="flex gap-4">
              <Link href={slide.href} className="btn-primary btn-lg">{slide.cta} <ArrowRight className="w-5 h-5" /></Link>
              <Link href="/products" className="btn-secondary btn-lg">Browse All</Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="w-72 h-72 rounded-full bg-gradient-to-br from-brand-red/20 to-blue-500/20 flex items-center justify-center text-7xl animate-bounce-subtle">
              {slide.badge.split(' ')[0]}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white mb-8">Shop by Category</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {categories.map(cat => (
            <Link key={cat.slug} href={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl`}>{cat.icon}</div>
              <span className="text-xs text-gray-400 text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-400" /> Featured Products</h2>
          <Link href="/products" className="text-brand-red text-sm flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredProducts.map(p => (
            <Link key={p.id} href={`/products/${p.slug}`} className="card-product group block">
              <div className="aspect-square bg-gray-800 overflow-hidden">
                <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500">{p.brand}</p>
                <h3 className="text-sm font-medium text-white mb-2 line-clamp-2">{p.name}</h3>
                <span className="text-lg font-bold text-white">₹{p.price?.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
