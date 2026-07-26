import { Router } from 'express';
import { getLogs, getLogDetail, getAlerts, resolveAlert, getStats, exportLogs } from '../controllers/socController';
import { authenticate, authorize, ROLES } from '../middleware/auth';

const router = Router();
const socRoles = [ROLES.SOC_ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN];
router.get('/stats', authenticate, authorize(...socRoles), getStats);
router.get('/logs', authenticate, authorize(...socRoles), getLogs);
router.get('/logs/export', authenticate, authorize(...socRoles), exportLogs);
router.get('/logs/:id', authenticate, authorize(...socRoles), getLogDetail);
router.get('/alerts', authenticate, authorize(...socRoles), getAlerts);
router.patch('/alerts/:id/resolve', authenticate, authorize(...socRoles), resolveAlert);
export default router;
