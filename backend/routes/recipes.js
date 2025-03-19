const express = require('express');
const multer = require('multer');
const path = require('path');
const recipeController = require('../controllers/recipeController');
const requireAuth = require('../middleware/authMiddleware');
const router = express.Router();

// Public routes that don't require authentication
router.get('/', recipeController.getRecipes);
router.get('/search', recipeController.searchRecipes);
router.get('/:id', recipeController.getRecipe);

// Protected routes that require authentication
// Apply middleware to all routes below
router.use(requireAuth);

// Storage configuration for recipe main images
const mainImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'recipeImages/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Storage configuration for step images and videos
const stepMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check field name pattern to determine the appropriate directory
        if (file.fieldname.startsWith('stepImage-')) {
            cb(null, 'recipeStepsImages/');
        } else if (file.fieldname.startsWith('stepVideo-')) {
            cb(null, 'recipeStepsVideos/');
        } else {
            cb(null, 'recipeImages/');
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File filter for media uploads
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'mainImage' || file.fieldname.startsWith('stepImage-')) {
        // For images
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
    } else if (file.fieldname.startsWith('stepVideo-')) {
        // For videos
        if (!file.originalname.match(/\.(mp4|mov|avi|wmv|mkv|webm)$/)) {
            return cb(new Error('Only video files are allowed!'), false);
        }
    }
    cb(null, true);
};

// Rest of your routes with authentication
router.post('/', (req, res, next) => {
    // Use multer with dynamic field handling
    const upload = multer({
        storage: stepMediaStorage,
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    }).any(); // Use .any() to accept any field

    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Server error:', err);
            return res.status(500).json({ error: `Server error: ${err.message}` });
        }
        next();
    });
}, recipeController.createRecipe);

router.patch('/:id', (req, res, next) => {
    // Use multer with dynamic field handling
    const upload = multer({
        storage: stepMediaStorage,
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    }).any(); // Use .any() to accept any field

    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Server error:', err);
            return res.status(500).json({ error: `Server error: ${err.message}` });
        }
        next();
    });
}, recipeController.updateRecipe);

router.delete('/:id', recipeController.deleteRecipe);
router.get('/user/:userId', recipeController.getRecipesByUserId);
router.post('/calculate-nutrition', requireAuth, recipeController.calculateNutrition);

const recipeGenerationController = require('../controllers/recipeGenerationController');

// Make sure middleware is correctly referenced
router.post('/generate-recipe', requireAuth, recipeGenerationController.generateRecipe);

module.exports = router;
