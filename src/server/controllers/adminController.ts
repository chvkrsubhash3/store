import { Request, Response } from 'express';
import { query } from '../config/db';

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [users, orders, revenue, products, sellers, pendingApprovals] = await Promise.all([
      query("SELECT COUNT(*) FROM users WHERE is_active = true"),
      query("SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(*) FROM products WHERE is_active = true"),
      query("SELECT COUNT(*) FROM sellers WHERE is_approved = true"),
      query("SELECT COUNT(*) FROM sellers WHERE approval_status = 'pending'"),
    ]);

    const revenueChart = await query("SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders FROM orders WHERE payment_status = 'paid' GROUP BY DATE(created_at) ORDER BY date ASC LIMIT 30");

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: parseInt(users.rows[0].count), totalOrders: parseInt(orders.rows[0].count),
          totalRevenue: parseFloat(revenue.rows[0].total), totalProducts: parseInt(products.rows[0].count),
          totalSellers: parseInt(sellers.rows[0].count), pendingApprovals: parseInt(pendingApprovals.rows[0].count),
        },
        charts: { revenueChart: revenueChart.rows },
      },
    });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch dashboard' }); }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', role } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = role ? `WHERE role = '${role}'` : '';
  try {
    const result = await query(`SELECT id, email, first_name, last_name, phone, role, is_active, is_banned, last_login, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    const count = await query(`SELECT COUNT(*) FROM users ${where}`);
    res.json({ success: true, data: { users: result.rows, pagination: { total: parseInt(count.rows[0].count) } } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch users' }); }
};

export const banUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { ban, reason } = req.body;
  try {
    await query('UPDATE users SET is_banned = $1, ban_reason = $2 WHERE id = $3', [ban !== false, reason || null, id]);
    res.json({ success: true, message: ban !== false ? 'User banned' : 'User unbanned' });
  } catch { res.status(500).json({ success: false, message: 'Failed to update user' }); }
};

export const getSellers = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const result = await query(`SELECT s.*, u.email, u.first_name, u.last_name FROM sellers s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    res.json({ success: true, data: { sellers: result.rows } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch sellers' }); }
};

export const approveSeller = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { approve } = req.body;
  try {
    await query('UPDATE sellers SET is_approved = $1, approval_status = $2 WHERE id = $3', [approve, approve ? 'approved' : 'rejected', id]);
    res.json({ success: true, message: approve ? 'Seller approved' : 'Seller rejected' });
  } catch { res.status(500).json({ success: false, message: 'Failed to update seller' }); }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const result = await query(`SELECT o.*, u.email, u.first_name, u.last_name FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    res.json({ success: true, data: { orders: result.rows } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch orders' }); }
};
