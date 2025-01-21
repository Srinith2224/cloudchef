const express = require('express');
const multer = require('multer');
const { generateRecipeFromImage, testDetectIngredients } = require('../controllers/recipeImageGenerationController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/generate-recipe-from-image-and-text', upload.single('image'), generateRecipeFromImage);
router.post('/test-detect-ingredients', upload.single('image'), testDetectIngredients);

module.exports = router;