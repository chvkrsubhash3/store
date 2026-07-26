import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, searchProducts, getRecommendations } from '../controllers/productController';
import { authenticate, optionalAuth, authorize, ROLES } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();
router.get('/', optionalAuth, getProducts);
router.get('/search', searchLimiter, searchProducts);
router.get('/recommendations', getRecommendations);
router.get('/:id', optionalAuth, getProduct);
router.post('/', authenticate, authorize(ROLES.SELLER, ROLES.ADMIN, ROLES.SUPER_ADMIN), createProduct);
router.put('/:id', authenticate, authorize(ROLES.SELLER, ROLES.ADMIN, ROLES.SUPER_ADMIN), updateProduct);
router.delete('/:id', authenticate, authorize(ROLES.SELLER, ROLES.ADMIN, ROLES.SUPER_ADMIN), deleteProduct);
export default router;
