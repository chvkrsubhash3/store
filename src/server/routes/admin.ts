import { Router } from 'express';
import { getDashboard, getUsers, banUser, getSellers, approveSeller, getAllOrders } from '../controllers/adminController';
import { authenticate, authorize, ROLES } from '../middleware/auth';

const router = Router();
const adminRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
router.get('/dashboard', authenticate, authorize(...adminRoles), getDashboard);
router.get('/users', authenticate, authorize(...adminRoles), getUsers);
router.patch('/users/:id/ban', authenticate, authorize(...adminRoles), banUser);
router.get('/sellers', authenticate, authorize(...adminRoles), getSellers);
router.patch('/sellers/:id/approve', authenticate, authorize(...adminRoles), approveSeller);
router.get('/orders', authenticate, authorize(...adminRoles), getAllOrders);
export default router;
