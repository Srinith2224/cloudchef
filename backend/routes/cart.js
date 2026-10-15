const express = require('express');
const cart = require('../controllers/cartController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', cart.getCartItems);
router.post('/add', cart.addItemToCart);
router.post('/add-multiple', cart.addMultipleItemsToCart);
router.post('/update', cart.updateItemQuantity);
router.delete('/delete', cart.deleteItemFromCart);
router.delete('/clear', cart.clearCart);

module.exports = router;
