const express = require('express');
const multer = require('multer');
const recipeController = require('../controllers/recipeController');
const { generateRecipe } = require('../controllers/recipeGenerationController');
const requireAuth = require('../middleware/authMiddleware');
const router = express.Router();

router.use(requireAuth); // Apply auth middleware to all routes

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'recipeImages/'); // Specify the directory to save the uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Use a unique filename
    }
});

const upload = multer({ storage: storage });

// POST a new recipe with image upload
router.post('/', upload.single('mainImage'), recipeController.createRecipe);

// GET all recipes
router.get('/', recipeController.getRecipes);

// Add this route for searching recipes
router.get('/search', recipeController.searchRecipes);

// GET a single recipe
router.get('/:id', recipeController.getRecipe);

// DELETE a recipe
router.delete('/:id', recipeController.deleteRecipe);

// UPDATE a recipe
router.patch('/:id', upload.single('mainImage'), recipeController.updateRecipe);

// GET recipes by userId
router.get('/user/:userId', recipeController.getRecipesByUserId);

// POST generate a recipe
router.post('/generate-recipe', generateRecipe);

// Add the route for nutrition calculation
router.post('/calculate-nutrition', requireAuth, recipeController.calculateNutrition);

module.exports = router;
