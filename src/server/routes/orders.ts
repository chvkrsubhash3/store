import { Router } from 'express';
import { createOrder, getOrders, getOrder, cancelOrder, trackOrder, simulatePayment } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrder);
router.post('/:id/cancel', authenticate, cancelOrder);
router.get('/:id/track', authenticate, trackOrder);
router.post('/:id/pay', authenticate, simulatePayment);
export default router;
