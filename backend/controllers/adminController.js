const User = require('../models/UserModel');
const Recipe = require('../models/RecipeModel');
const mongoose = require('mongoose');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user role
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    
    try {
        const user = await User.findByIdAndUpdate(
            id, 
            { role }, 
            { new: true, select: '-password' }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete user and all their recipes
const deleteUser = async (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Delete user's recipes
        await Recipe.deleteMany({ 'createdBy._id': id });
        
        // Delete the user
        await User.findByIdAndDelete(id);
        
        res.status(200).json({ message: 'User and associated recipes deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin can edit any recipe
const updateAnyRecipe = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    try {
        const recipe = await Recipe.findByIdAndUpdate(id, updates, { new: true });
        
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        res.status(200).json(recipe);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin can delete any recipe
const deleteAnyRecipe = async (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    try {
        const recipe = await Recipe.findByIdAndDelete(id);
        
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        res.status(200).json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllUsers,
    updateUserRole,
    deleteUser,
    updateAnyRecipe,
    deleteAnyRecipe
};