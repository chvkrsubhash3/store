import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, applyCoupon, getWishlist, toggleWishlist } from '../controllers/cartController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.get('/cart', authenticate, getCart);
router.post('/cart/add', authenticate, addToCart);
router.patch('/cart/update', authenticate, updateCartItem);
router.delete('/cart/remove/:productId', authenticate, removeFromCart);
router.delete('/cart/clear', authenticate, clearCart);
router.post('/cart/coupon', authenticate, applyCoupon);
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist/toggle', authenticate, toggleWishlist);
export default router;
