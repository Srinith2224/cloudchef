const express = require('express');
const { addRating, getRecipeRatings, getUserRating, deleteMyRating } = require('../controllers/ratingController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/recipe/:recipeId', getRecipeRatings); // public
router.post('/', requireAuth, addRating);
router.get('/user/recipe/:recipeId', requireAuth, getUserRating);
router.delete('/recipe/:recipeId', requireAuth, deleteMyRating);

module.exports = router;
