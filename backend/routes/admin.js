const express = require('express');
const admin = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', admin.getStats);
router.get('/users', admin.getAllUsers);
router.patch('/users/:id/role', admin.updateUserRole);
router.delete('/users/:id', admin.deleteUser);
router.get('/recipes', admin.getAllRecipes);
router.delete('/recipes/:id', admin.deleteAnyRecipe);
router.get('/reports', admin.getReports);
router.patch('/reports/:id', admin.updateReport);

module.exports = router;
