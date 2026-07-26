import { Request, Response } from 'express';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { addressId, paymentMethod = 'cod', notes } = req.body;
  try {
    const cartResult = await query('SELECT * FROM carts WHERE user_id = $1', [user.id]);
    if (!cartResult.rows.length || !cartResult.rows[0].items?.length) {
      res.status(400).json({ success: false, message: 'Cart is empty' }); return;
    }
    const cart = cartResult.rows[0];
    const subtotal = parseFloat(cart.subtotal) || 0;
    const discount = parseFloat(cart.discount_amount) || 0;
    const shipping = subtotal > 500 ? 0 : 49;
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal - discount + shipping + tax;
    const orderNumber = `SM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const orderResult = await query(`
      INSERT INTO orders (
        order_number, user_id, status, payment_method, payment_status,
        items, shipping_address, subtotal, discount_amount, shipping_amount,
        tax_amount, total_amount, coupon_code, notes
      ) VALUES ($1,$2,'confirmed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [orderNumber, user.id, paymentMethod, paymentMethod === 'cod' ? 'pending' : 'processing', JSON.stringify(cart.items), JSON.stringify({ addressId }), subtotal, discount, shipping, tax, total, cart.coupon_code, notes]);

    const order = orderResult.rows[0];
    const txnId = `TXN-${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
    await query('INSERT INTO payments (order_id, user_id, transaction_id, payment_method, amount, status) VALUES ($1,$2,$3,$4,$5,$6)', [order.id, user.id, txnId, paymentMethod, total, paymentMethod === 'cod' ? 'pending' : 'processing']);
    await query('UPDATE carts SET items = $1, subtotal = 0, coupon_code = NULL, discount_amount = 0 WHERE user_id = $2', ['[]', user.id]);

    res.status(201).json({ success: true, message: 'Order placed successfully', data: { orderId: order.id, orderNumber, total, status: order.status } });
  } catch (error: any) { res.status(500).json({ success: false, message: 'Order failed', error: error.message }); }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [user.id, parseInt(limit), offset]);
    const count = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [user.id]);
    res.json({ success: true, data: { orders: result.rows, pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch orders' }); }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM orders WHERE (id = $1 OR order_number = $1) AND (user_id = $2 OR $3 IN (\'admin\', \'super_admin\', \'soc_analyst\'))', [id, user.id, user.role]);
    if (!result.rows.length) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Order details failed' }); }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    await query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 AND user_id = $2", [id, user.id]);
    res.json({ success: true, message: 'Order cancelled' });
  } catch { res.status(500).json({ success: false, message: 'Cancellation failed' }); }
};

export const trackOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT status, order_number, tracking_number, created_at FROM orders WHERE id = $1', [req.params.id]);
    if (!result.rows.length) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, data: { order: result.rows[0] } });
  } catch { res.status(500).json({ success: false, message: 'Tracking failed' }); }
};

export const simulatePayment = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { orderId, method } = req.body;
  try {
    const txnId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    await query("UPDATE payments SET status = 'success', transaction_id = $1 WHERE order_id = $2", [txnId, orderId]);
    await query("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = $1 AND user_id = $2", [orderId, user.id]);
    res.json({ success: true, message: 'Payment successful', data: { transactionId: txnId } });
  } catch { res.status(500).json({ success: false, message: 'Payment simulation failed' }); }
};
