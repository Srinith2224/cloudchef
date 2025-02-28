const express = require('express');
const multer = require('multer');
const {
    getRecipes,
    getRecipe,
    createRecipe,
    deleteRecipe,
    updateRecipe,
    getRecipesByUserId,
    searchRecipes // Add this line
} = require('../controllers/recipeController');
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
router.post('/', upload.single('mainImage'), createRecipe);

// GET all recipes
router.get('/', getRecipes);

// Add this route for searching recipes
router.get('/search', searchRecipes);

// GET a single recipe
router.get('/:id', getRecipe);

// DELETE a recipe
router.delete('/:id', deleteRecipe);

// UPDATE a recipe
router.patch('/:id', upload.single('mainImage'), updateRecipe);

// GET recipes by userId
router.get('/user/:userId', getRecipesByUserId);

// POST generate a recipe
router.post('/generate-recipe', generateRecipe);

module.exports = router;
