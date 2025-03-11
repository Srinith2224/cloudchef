const mongoose = require('mongoose');
const User = require('../models/UserModel');
const Recipe = require('../models/RecipeModel');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

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

// Follow a user
const followUser = async (req, res) => {
    const { id } = req.params; // ID of user to follow
    const currentUserId = req.userId; // ID of current user

    if (id === currentUserId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        // Get both users
        const userToFollow = await User.findById(id);
        const currentUser = await User.findById(currentUserId);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already following
        if (userToFollow.followers.includes(currentUserId)) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Update both users
        await User.findByIdAndUpdate(id, {
            $push: { followers: currentUserId }
        });
        
        await User.findByIdAndUpdate(currentUserId, {
            $push: { following: id }
        });

        res.status(200).json({ message: 'User followed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
    const { id } = req.params; // ID of user to unfollow
    const currentUserId = req.userId; // ID of current user

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        // Update both users
        await User.findByIdAndUpdate(id, {
            $pull: { followers: currentUserId }
        });
        
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: id }
        });

        res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user profile with social info
const getUserProfile = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id)
            .select('-password')
            .populate('featuredRecipe');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get follower and following counts
        const followerCount = user.followers.length;
        const followingCount = user.following.length;

        // Get user's recipes
        const recipes = await Recipe.find({ 'createdBy._id': id }).sort({ createdAt: -1 }).limit(9);

        // Check if requesting user is following this profile
        let isFollowing = false;
        if (req.userId) {
            const currentUser = await User.findById(req.userId);
            isFollowing = currentUser.following.includes(id);
        }

        res.status(200).json({
            ...user.toObject(),
            followerCount,
            followingCount,
            recipes,
            isFollowing
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get followers list
const getFollowers = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id).populate('followers', 'firstName lastName profilePhoto');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user.followers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get following list
const getFollowing = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id).populate('following', 'firstName lastName profilePhoto');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user.following);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Set featured recipe
const setFeaturedRecipe = async (req, res) => {
    const { recipeId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    try {
        // Verify recipe belongs to user
        const recipe = await Recipe.findById(recipeId);
        if (!recipe || recipe.createdBy._id.toString() !== userId) {
            return res.status(403).json({ error: 'You can only feature your own recipes' });
        }

        await User.findByIdAndUpdate(userId, { featuredRecipe: recipeId });
        
        res.status(200).json({ message: 'Featured recipe updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    updateUserProfile, 
    getUserById, 
    saveRecipe, 
    getSavedRecipes, 
    deleteSavedRecipe, 
    upload, 
    followUser,
    unfollowUser,
    getUserProfile,
    getFollowers,
    getFollowing,
    setFeaturedRecipe
};
