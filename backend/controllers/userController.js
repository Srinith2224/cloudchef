const mongoose = require('mongoose');
const User = require('../models/UserModel');
const Recipe = require('../models/RecipeModel');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'profilePhotos/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, password, about, region } = req.body;

    const updates = { firstName, lastName, email, about, region };
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }
    if (req.file) {
        updates.profilePhoto = `/profilePhotos/${req.file.filename}`;
    }

    try {
        const user = await User.findByIdAndUpdate(id, updates, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ ...user.toObject(), userId: user._id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUserById = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const saveRecipe = async (req, res) => {
    const { userId, recipeId } = req.body;

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

const getSavedRecipes = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(userId).populate('savedRecipes');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user.savedRecipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteSavedRecipe = async (req, res) => {
    const { userId, recipeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid user or recipe ID' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.savedRecipes.pull(recipeId);
        await user.save();

        res.status(200).json({ message: 'Recipe removed from saved recipes' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { updateUserProfile, getUserById, saveRecipe, getSavedRecipes, deleteSavedRecipe, upload };
