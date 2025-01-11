const Recipe = require('../models/RecipeModel');
const mongoose = require('mongoose');
const User = require('../models/UserModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import the fs module

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'recipeImages/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Get all recipes
const getRecipes = async (req, res) => {
    try {
        const recipes = await Recipe.find({}).sort({ createdAt: -1 });
        res.status(200).json(recipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get a single recipe
const getRecipe = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such recipe' });
    }

    const recipe = await Recipe.findById(id).populate('createdBy', 'firstName lastName');

    if (!recipe) {
        return res.status(404).json({ error: 'No such recipe' });
    }

    res.status(200).json(recipe);
};

// Create new recipe
const createRecipe = async (req, res) => {
    const { title, description, tags } = req.body;
    const userId = req.userId;
    const mainImage = req.file ? `/recipeImages/${req.file.filename}` : null;

    // Parse totalTime and nutrition from form-data
    const totalTime = {
        hours: parseInt(req.body.totalTime.hours, 10),
        minutes: parseInt(req.body.totalTime.minutes, 10)
    };

    const nutrition = {
        calories: parseInt(req.body.nutrition.calories, 10),
        fat: parseInt(req.body.nutrition.fat, 10),
        protein: parseInt(req.body.nutrition.protein, 10),
        carbs: parseInt(req.body.nutrition.carbs, 10)
    };

    // Validate parsed values
    if (isNaN(totalTime.hours) || isNaN(totalTime.minutes) || isNaN(nutrition.calories) || isNaN(nutrition.fat) || isNaN(nutrition.protein) || isNaN(nutrition.carbs)) {
        return res.status(400).json({ error: 'Invalid totalTime or nutrition values' });
    }

    // Parse ingredients and steps from string to JSON
    let ingredients, steps;
    try {
        ingredients = JSON.parse(req.body.ingredients);
        steps = JSON.parse(req.body.steps);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid ingredients or steps format' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const recipe = await Recipe.create({
            title,
            mainImage,
            description,
            totalTime,
            ingredients,
            nutrition,
            steps,
            createdBy: {
                _id: userId,
                firstName: user.firstName,
                lastName: user.lastName
            },
            tags
        });

        res.status(200).json(recipe);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete a recipe
const deleteRecipe = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such recipe' });
    }

    try {
        const recipe = await Recipe.findOneAndDelete({ _id: id });
        if (!recipe) {
            return res.status(404).json({ error: 'No such recipe' });
        }

        // Delete the associated image file
        if (recipe.mainImage) {
            const imagePath = path.join(__dirname, '..', recipe.mainImage);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    // Handle error silently
                }
            });
        }

        res.status(200).json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Update recipe
const updateRecipe = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such recipe' });
    }

    const updates = {
        title: req.body.title,
        description: req.body.description,
        totalTime: {
            hours: parseInt(req.body.totalTime.hours, 10),
            minutes: parseInt(req.body.totalTime.minutes, 10)
        },
        ingredients: JSON.parse(req.body.ingredients),
        steps: JSON.parse(req.body.steps),
        nutrition: {
            calories: parseInt(req.body.nutrition.calories, 10),
            fat: parseInt(req.body.nutrition.fat, 10),
            protein: parseInt(req.body.nutrition.protein, 10),
            carbs: parseInt(req.body.nutrition.carbs, 10)
        },
        tags: req.body.tags
    };
    // Validate parsed values
    if (isNaN(updates.totalTime.hours) || isNaN(updates.totalTime.minutes) || isNaN(updates.nutrition.calories) || isNaN(updates.nutrition.fat) || isNaN(updates.nutrition.protein) || isNaN(updates.nutrition.carbs)) {
        return res.status(400).json({ error: 'Invalid totalTime or nutrition values' });
    }

    // Check if a new image file is uploaded
    if (req.file) {
        updates.mainImage = `/recipeImages/${req.file.filename}`;
    }

    try {
        const recipe = await Recipe.findOneAndUpdate(
            { _id: id },
            { $set: updates },
            { new: true }
        );

        if (!recipe) {
            return res.status(404).json({ error: 'No such recipe' });
        }

        res.status(200).json(recipe);
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Server error' });
    }
};



// Get recipes by user ID
const getRecipesByUserId = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const recipes = await Recipe.find({ 'createdBy._id': userId }).sort({ createdAt: -1 });
        if (recipes.length === 0) {
            return res.status(404).json({ error: 'No recipes found for this user' });
        }
        res.status(200).json(recipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const saveRecipe = async (req, res) => {
    const userId = req.userId;
    const { recipeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid user or recipe ID' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        user.savedRecipes.push(recipeId);
        await user.save();

        res.status(200).json({ message: 'Recipe saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const searchRecipes = async (req, res) => {
    const { query } = req.query;
    try {
      const results = await Recipe.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { 'ingredients.name': { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } }
        ]
      });
      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'No recipes found' });
      }
      res.status(200).json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

module.exports = {
    getRecipes,
    getRecipe,
    createRecipe,
    deleteRecipe,
    updateRecipe,
    getRecipesByUserId,
    saveRecipe,
    searchRecipes // Add this line
};
