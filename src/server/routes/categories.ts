import { Router, Request, Response } from 'express';
import { query } from '../config/db';

const router = Router();
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id) as product_count FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true AND p.is_approved = true
      WHERE c.is_active = true GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
});
export default router;
