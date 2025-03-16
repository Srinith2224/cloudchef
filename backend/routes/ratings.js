const express = require('express');
const { addRating, getRecipeRatings, getUserRating } = require('../controllers/ratingController');
const requireAuth = require('../middleware/authMiddleware'); // Corrected path

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

// Routes
router.post('/', addRating);
router.get('/recipe/:recipeId', getRecipeRatings);
router.get('/user/recipe/:recipeId', getUserRating);

module.exports = router;