'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Shield, ShoppingCart, Heart, ChevronLeft, Plus, Minus, Check } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setProduct(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const addToCart = async () => {
    if (!product) return;

    // 1. Save to local cart state immediately so guest cart works 100%
    const existingCart = localStorage.getItem('securemart_cart');
    let items: any[] = [];
    if (existingCart) {
      try { items = JSON.parse(existingCart); } catch {}
    }

    const idx = items.findIndex((i: any) => i.productId === product.id || i.product_id === product.id);
    if (idx >= 0) {
      items[idx].quantity += quantity;
    } else {
      items.push({
        id: product.id,
        productId: product.id,
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        price: parseFloat(product.price || 0),
        quantity,
        thumbnail: product.thumbnail_url,
        thumbnail_url: product.thumbnail_url,
        stock_quantity: product.stock_quantity || 100,
        brand: product.brand || 'SecureMart',
      });
    }

    localStorage.setItem('securemart_cart', JSON.stringify(items));

    // 2. Also sync to backend API if user token exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity }),
      }).catch(() => {});
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="skeleton w-72 h-72 rounded-3xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
        <p className="text-gray-400 text-sm mb-6">The requested item &quot;{slug}&quot; could not be located in our catalog.</p>
        <Link href="/products" className="btn-primary text-sm px-6 py-3">Back to Products</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <span className="font-black text-white">Secure<span className="text-brand-red">Mart</span></span>
        </Link>
        <Link href="/cart" className="btn-ghost text-sm gap-2">
          <ShoppingCart className="w-5 h-5 text-brand-red" /> View Cart
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8">
          <ChevronLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-900 rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center p-4">
            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-brand-red font-semibold uppercase tracking-wider mb-1">{product.category_name || product.brand}</p>
              <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>
              <p className="text-3xl font-black text-white">₹{parseFloat(product.price || 0).toLocaleString()}</p>
            </div>

            {product.description && (
              <p className="text-gray-400 text-sm leading-relaxed">{product.description}</p>
            )}

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Quantity:</span>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-white/10">-</button>
                <span className="text-white font-bold px-3">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-white/10">+</button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={addToCart} className={`flex-1 py-4 gap-2 text-base ${added ? 'bg-green-600 text-white' : 'btn-primary'}`}>
                {added ? <><Check className="w-5 h-5" /> Added to Cart!</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
              </button>
              <Link href="/cart" className="btn-secondary px-6 py-4">View Cart</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
