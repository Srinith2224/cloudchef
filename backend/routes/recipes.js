const express = require('express');
const recipeController = require('../controllers/recipeController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadRecipeFiles } = require('../config/cloudinaryConfig');

const router = express.Router();

// Public
router.get('/', recipeController.getRecipes);
router.get('/search', recipeController.searchRecipes);
router.get('/user/:userId', recipeController.getRecipesByUserId);
router.get('/:id', recipeController.getRecipe);

// Signed-in users
router.post('/calculate-nutrition', requireAuth, recipeController.calculateNutrition);
router.post('/', requireAuth, uploadRecipeFiles, recipeController.createRecipe);
router.patch('/:id', requireAuth, uploadRecipeFiles, recipeController.updateRecipe);
router.delete('/:id', requireAuth, recipeController.deleteRecipe);

module.exports = router;
