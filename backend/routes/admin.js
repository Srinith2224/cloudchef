const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// Apply authentication and admin middleware to all routes
router.use(requireAuth, requireAdmin);

// User management routes
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Recipe management routes
router.patch('/recipes/:id', adminController.updateAnyRecipe);
router.delete('/recipes/:id', adminController.deleteAnyRecipe);

module.exports = router;