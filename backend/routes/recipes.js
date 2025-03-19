const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Recipe = require('../models/RecipeModel');
const requireAuth = require('../middleware/authMiddleware');
const recipeController = require('../controllers/recipeController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import the cloudinary config
const { 
  cloudinary,
  uploadRecipeImage, 
  uploadRecipeStepsImage, 
  uploadRecipeStepsVideo 
} = require('../config/cloudinaryConfig');

// Public routes
router.get('/', recipeController.getRecipes);
router.get('/search', recipeController.searchRecipes);
router.get('/:id', recipeController.getRecipe);

// Protected routes
router.use(requireAuth);

// Update route to use Cloudinary for recipe creation
router.post('/add', uploadRecipeImage.single('mainImage'), async (req, res) => {
  try {
    const { title, description, instructions, ingredients, prepTime, cookTime, servings, cuisine, difficulty, tags, nutritionInfo } = req.body;
    
    // Get the Cloudinary URL from the uploaded file
    const mainImageUrl = req.file ? req.file.path : null;
    
    const newRecipe = new Recipe({
      title,
      description,
      user: req.userId, // Use req.userId from the middleware
      mainImage: mainImageUrl, // Use Cloudinary URL
      prepTime,
      cookTime,
      servings,
      cuisine,
      difficulty,
      tags: tags ? JSON.parse(tags) : [],
      nutritionInfo: nutritionInfo ? JSON.parse(nutritionInfo) : {},
      ingredients: ingredients ? JSON.parse(ingredients) : [],
      instructions: instructions ? JSON.parse(instructions) : []
    });

    const savedRecipe = await newRecipe.save();
    res.json(savedRecipe);
  } catch (error) {
    console.error('Error adding recipe:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Use Cloudinary for step image uploads
router.post('/steps/image', uploadRecipeStepsImage.single('stepImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    // Return the Cloudinary URL
    res.json({ imageUrl: req.file.path });
  } catch (error) {
    console.error('Error uploading step image:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Use Cloudinary for step video uploads
router.post('/steps/video', uploadRecipeStepsVideo.single('stepVideo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }
    
    // Return the Cloudinary URL
    res.json({ videoUrl: req.file.path });
  } catch (error) {
    console.error('Error uploading step video:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// For create recipe with multiple files
router.post('/', (req, res, next) => {
  const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'mainImage' || file.fieldname.startsWith('stepImage')) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for images!'), false);
      }
    } else if (file.fieldname.startsWith('stepVideo')) {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for videos!'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  };

  // Use Cloudinary dynamic upload
  const dynamicUpload = multer({
    storage: require('../config/cloudinaryConfig').dynamicStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit to accommodate videos
  }).any(); // Use .any() to accept any field

  dynamicUpload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
  });
}, recipeController.createRecipe);

// Update route with dynamic file uploads
router.patch('/:id', (req, res, next) => {
  // Use dynamic file upload
  const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.fieldname === 'mainImage' || file.fieldname.startsWith('stepImage')) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for images!'), false);
      }
    } else if (file.fieldname.startsWith('stepVideo')) {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for videos!'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  };

  // Use Cloudinary dynamic upload
  const dynamicUpload = multer({
    storage: require('../config/cloudinaryConfig').dynamicStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit to accommodate videos
  }).any(); // Use .any() to accept any field

  dynamicUpload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
  });
}, recipeController.updateRecipe);

// Use existing routes for other functions
router.get('/user/:userId', recipeController.getRecipesByUserId);
router.post('/save/:id', recipeController.saveRecipe);
router.post('/calculate-nutrition', recipeController.calculateNutrition);
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
