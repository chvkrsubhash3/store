import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, data: user });
});

router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [user.id]);
    res.json({ success: true, data: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
});

router.patch('/notifications/:id/read', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    res.json({ success: true, message: 'Marked read' });
  } catch { res.status(500).json({ success: false, message: 'Failed' }); }
});

export default router;
