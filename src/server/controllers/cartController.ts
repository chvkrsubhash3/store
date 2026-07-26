import { Request, Response } from 'express';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const getCart = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  try {
    const result = await query('SELECT * FROM carts WHERE user_id = $1::uuid', [user.id]);
    if (!result.rows.length) {
      res.json({ success: true, data: { items: [], subtotal: 0, discount: 0, total: 0 } });
      return;
    }
    const cart = result.rows[0];
    const items = cart.items || [];
    res.json({ success: true, data: { ...cart, items } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch cart', error: error.message });
  }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { productId, quantity = 1 } = req.body;
  try {
    const product = await query('SELECT id, name, slug, price, thumbnail_url, stock_quantity, brand, is_active FROM products WHERE id = $1::uuid', [productId]);
    if (!product.rows.length || !product.rows[0].is_active) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const p = product.rows[0];
    if (p.stock_quantity < quantity) {
      res.status(400).json({ success: false, message: 'Insufficient stock' });
      return;
    }

    const newItem = {
      id: uuidv4(),
      productId: p.id,
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      price: parseFloat(p.price),
      quantity,
      thumbnail: p.thumbnail_url,
      thumbnail_url: p.thumbnail_url,
      stock_quantity: p.stock_quantity,
      brand: p.brand || 'SecureMart',
    };

    const cartResult = await query('SELECT * FROM carts WHERE user_id = $1::uuid', [user.id]);
    let items: any[] = [];

    if (!cartResult.rows.length) {
      items = [newItem];
      const subtotal = newItem.price * quantity;
      await query('INSERT INTO carts (id, user_id, items, subtotal) VALUES ($1::uuid, $2::uuid, $3, $4)', [uuidv4(), user.id, JSON.stringify(items), subtotal]);
    } else {
      items = cartResult.rows[0].items || [];
      const existing = items.find((i: any) => i.productId === productId || i.product_id === productId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, 100);
      } else {
        items.push(newItem);
      }
      const subtotal = items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.quantity), 0);
      await query('UPDATE carts SET items = $1, subtotal = $2, updated_at = NOW() WHERE user_id = $3::uuid', [JSON.stringify(items), subtotal, user.id]);
    }

    res.json({ success: true, message: 'Added to cart', data: { items } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add to cart', error: error.message });
  }
};

export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { productId, quantity } = req.body;
  try {
    const cartResult = await query('SELECT * FROM carts WHERE user_id = $1::uuid', [user.id]);
    if (!cartResult.rows.length) { res.status(404).json({ success: false, message: 'Cart not found' }); return; }
    let items: any[] = cartResult.rows[0].items || [];
    if (quantity <= 0) {
      items = items.filter((i: any) => i.productId !== productId && i.product_id !== productId);
    } else {
      const item = items.find((i: any) => i.productId === productId || i.product_id === productId);
      if (item) item.quantity = quantity;
    }
    const subtotal = items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.quantity), 0);
    await query('UPDATE carts SET items = $1, subtotal = $2, updated_at = NOW() WHERE user_id = $3::uuid', [JSON.stringify(items), subtotal, user.id]);
    res.json({ success: true, data: { items, subtotal } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
};

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { productId } = req.params;
  try {
    const cartResult = await query('SELECT * FROM carts WHERE user_id = $1::uuid', [user.id]);
    if (!cartResult.rows.length) { res.status(404).json({ success: false, message: 'Cart not found' }); return; }
    const items = (cartResult.rows[0].items || []).filter((i: any) => i.productId !== productId && i.product_id !== productId);
    const subtotal = items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.quantity), 0);
    await query('UPDATE carts SET items = $1, subtotal = $2, updated_at = NOW() WHERE user_id = $3::uuid', [JSON.stringify(items), subtotal, user.id]);
    res.json({ success: true, message: 'Item removed', data: { items } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  try {
    await query('UPDATE carts SET items = $1, subtotal = 0, coupon_code = NULL, discount_amount = 0, updated_at = NOW() WHERE user_id = $2::uuid', ['[]', user.id]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { couponCode } = req.body;
  try {
    const couponResult = await query('SELECT * FROM coupons WHERE code = $1 AND is_active = true', [couponCode?.toUpperCase()]);
    if (!couponResult.rows.length) { res.status(400).json({ success: false, message: 'Invalid coupon' }); return; }
    const coupon = couponResult.rows[0];
    const cartResult = await query('SELECT * FROM carts WHERE user_id = $1::uuid', [user.id]);
    if (!cartResult.rows.length) { res.status(400).json({ success: false, message: 'Cart empty' }); return; }
    const cart = cartResult.rows[0];
    let discount = coupon.discount_type === 'percentage' ? (parseFloat(cart.subtotal) * parseFloat(coupon.discount_value)) / 100 : parseFloat(coupon.discount_value);
    await query('UPDATE carts SET coupon_code = $1, discount_amount = $2 WHERE user_id = $3::uuid', [couponCode.toUpperCase(), discount, user.id]);
    res.json({ success: true, message: `Saved ₹${discount.toFixed(2)}`, data: { discountAmount: discount } });
  } catch {
    res.status(500).json({ success: false, message: 'Coupon error' });
  }
};

export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  try {
    const result = await query(`
      SELECT w.id, w.created_at, p.id as product_id, p.name, p.slug, p.price, p.thumbnail_url, p.rating, p.stock_quantity
      FROM wishlists w JOIN products p ON p.id = w.product_id WHERE w.user_id = $1::uuid ORDER BY w.created_at DESC
    `, [user.id]);
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Wishlist error' });
  }
};

export const toggleWishlist = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { productId } = req.body;
  try {
    const existing = await query('SELECT id FROM wishlists WHERE user_id = $1::uuid AND product_id = $2::uuid', [user.id, productId]);
    if (existing.rows.length > 0) {
      await query('DELETE FROM wishlists WHERE user_id = $1::uuid AND product_id = $2::uuid', [user.id, productId]);
      res.json({ success: true, message: 'Removed', data: { inWishlist: false } });
    } else {
      await query('INSERT INTO wishlists (user_id, product_id) VALUES ($1::uuid, $2::uuid)', [user.id, productId]);
      res.json({ success: true, message: 'Added', data: { inWishlist: true } });
    }
  } catch {
    res.status(500).json({ success: false, message: 'Wishlist toggle error' });
  }
};
