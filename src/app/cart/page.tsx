'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, ChevronLeft } from 'lucide-react';

interface CartItem {
  id: string; productId: string; product_id: string; name: string; slug: string; price: number;
  quantity: number; thumbnail: string; thumbnail_url: string; stock_quantity: number; brand: string;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchCart = async () => {
    // 1. Try fetching from server API if user token present
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      try {
        const res = await fetch('/api/cart', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data?.items?.length > 0) {
          setItems(data.data.items || []);
          setLoading(false);
          return;
        }
      } catch {}
    }

    // 2. Fallback to localStorage guest cart
    const local = localStorage.getItem('securemart_cart');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setItems(parsed);
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { fetchCart(); }, []);

  const saveLocalCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('securemart_cart', JSON.stringify(newItems));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) return removeItem(productId);
    const updated = items.map(i => (i.productId === productId || i.product_id === productId) ? { ...i, quantity } : i);
    saveLocalCart(updated);

    const token = localStorage.getItem('accessToken');
    if (token) {
      await fetch('/api/cart/update', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
      }).catch(() => {});
    }
  };

  const removeItem = async (productId: string) => {
    const updated = items.filter(i => i.productId !== productId && i.product_id !== productId);
    saveLocalCart(updated);

    const token = localStorage.getItem('accessToken');
    if (token) {
      await fetch(`/api/cart/item/${productId}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      }).catch(() => {});
    }
  };

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const code = couponCode.toUpperCase().trim();
    if (['WELCOME10', 'FLAT50', 'SECURE50'].includes(code)) {
      setDiscount(50);
      setCouponApplied(true);
    } else {
      alert('Invalid coupon code. Try WELCOME10 or FLAT50');
    }
  };

  const subtotal = items.reduce((acc, i) => acc + (parseFloat(i.price as any) * i.quantity), 0);
  const shipping = subtotal > 500 || items.length === 0 ? 0 : 40;
  const total = Math.max(0, subtotal - discount + shipping);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <nav className="glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <span className="font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
        </Link>
        <Link href="/products" className="btn-ghost text-sm gap-2"><ChevronLeft className="w-4 h-4" /> Continue Shopping</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-brand-red" /> Your Shopping Cart ({items.length})
        </h1>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center max-w-md mx-auto">
            <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-gray-400 text-sm mb-6">Looks like you haven&apos;t added any products to your cart yet.</p>
            <Link href="/products" className="btn-primary text-sm px-6 py-3">Explore Products</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => {
                const pId = item.productId || item.product_id;
                const img = item.thumbnail_url || item.thumbnail;
                return (
                  <div key={item.id || pId} className="glass rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                    <div className="w-20 h-20 bg-gray-900 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{item.brand || 'SecureMart'}</p>
                      <Link href={`/products/${item.slug}`} className="text-sm font-semibold text-white hover:text-brand-red truncate block">{item.name}</Link>
                      <p className="text-sm font-bold text-white mt-1">₹{parseFloat(item.price as any).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                      <button onClick={() => updateQuantity(pId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-white/10">-</button>
                      <span className="text-white font-bold text-sm px-2">{item.quantity}</span>
                      <button onClick={() => updateQuantity(pId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-white/10">+</button>
                    </div>
                    <button onClick={() => removeItem(pId)} className="btn-ghost text-red-400 hover:text-red-300 p-2" title="Remove item">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                <h2 className="text-lg font-bold text-white pb-3 border-b border-white/5">Order Summary</h2>

                <form onSubmit={applyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code" className="input text-xs pl-9" />
                  </div>
                  <button type="submit" className="btn-secondary text-xs px-4">Apply</button>
                </form>
                {couponApplied && <p className="text-xs text-green-400">✅ Coupon applied (-₹{discount})</p>}

                <div className="space-y-2 text-sm pt-2">
                  <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="text-white font-medium">₹{subtotal.toLocaleString()}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-₹{discount}</span></div>}
                  <div className="flex justify-between text-gray-400"><span>Shipping</span><span className="text-white font-medium">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                  <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-white/5">
                    <span>Total Amount</span>
                    <span className="text-brand-red">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <button onClick={() => { localStorage.removeItem('securemart_cart'); setItems([]); alert('🎉 Order Placed Successfully!'); }} className="btn-primary w-full py-4 text-base gap-2 mt-4">
                  Proceed to Checkout <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
