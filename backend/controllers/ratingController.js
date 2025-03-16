const Rating = require('../models/RatingModel');
const Recipe = require('../models/RecipeModel');
const mongoose = require('mongoose');

// Add a new rating
const addRating = async (req, res) => {
    const { recipeId, rating, comment } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
        // Check if recipe exists
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Prevent creator from rating their own recipe
        if (recipe.createdBy._id.toString() === userId) {
            return res.status(403).json({ error: 'You cannot rate your own recipe' });
        }

        // Get user's name for the rating
        const user = await mongoose.model('User').findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userName = `${user.firstName} ${user.lastName}`;

        // Create or update the rating in the Rating collection
        let existingRating = await Rating.findOne({ recipeId, userId });

        if (existingRating) {
            // Update existing rating
            existingRating.rating = rating;
            existingRating.comment = comment || "";
            await existingRating.save();
        } else {
            // Create new rating
            existingRating = await Rating.create({
                recipeId,
                userId,
                userName,
                rating,
                comment: comment || ""
            });
        }

        // Get all ratings from Rating collection
        const allRatings = await Rating.find({ recipeId });
        const avgRating = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;
        
        // Update recipe's ratings array directly
        // First check if this user already rated in the array
        let recipeUpdated;
        
        if (Array.isArray(recipe.ratings)) {
            // If ratings is an array in the recipe document
            const userRatingIndex = recipe.ratings.findIndex(r => 
                r.userId && r.userId.toString() === userId);

            if (userRatingIndex >= 0) {
                // Update existing rating in the array
                recipeUpdated = await Recipe.findByIdAndUpdate(
                    recipeId,
                    { 
                        $set: { 
                            [`ratings.${userRatingIndex}.rating`]: rating,
                            [`ratings.${userRatingIndex}.comment`]: comment || "",
                            [`ratings.${userRatingIndex}.createdAt`]: new Date()
                        } 
                    },
                    { new: true }
                );
            } else {
                // Add new rating to the array
                recipeUpdated = await Recipe.findByIdAndUpdate(
                    recipeId,
                    { 
                        $push: { 
                            ratings: {
                                userId,
                                rating,
                                comment: comment || "",
                                createdAt: new Date()
                            }
                        } 
                    },
                    { new: true }
                );
            }
        } else {
            // If ratings is not defined or is not an array, initialize it as an array
            recipeUpdated = await Recipe.findByIdAndUpdate(
                recipeId,
                { 
                    $set: { 
                        ratings: [{
                            userId,
                            rating,
                            comment: comment || "",
                            createdAt: new Date()
                        }]
                    } 
                },
                { new: true }
            );
        }

        res.status(200).json({ 
            message: 'Rating added successfully', 
            rating: existingRating,
            recipeRatings: recipeUpdated.ratings
        });
    } catch (error) {
        console.error('Error adding rating:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all ratings for a recipe
const getRecipeRatings = async (req, res) => {
    const { recipeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    try {
        // Get ratings from the Rating collection with comments, sorted by date
        const ratingsWithComments = await Rating.find({ 
            recipeId, 
            comment: { $ne: "" } 
        }).sort({ createdAt: -1 });

        // Get count of ratings without comments grouped by rating value
        const ratingCounts = await Rating.aggregate([
            { $match: { 
                recipeId: new mongoose.Types.ObjectId(recipeId), 
                comment: "" 
            }},
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]);

        // Also get the recipe to calculate average
        const recipe = await Recipe.findById(recipeId);
        let avgRating = 0;
        
        if (recipe) {
            // If we have ratings in the Rating collection
            const allRatings = await Rating.find({ recipeId });
            if (allRatings.length > 0) {
                avgRating = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;
            }
            // Alternatively, calculate from the recipe's ratings array
            else if (Array.isArray(recipe.ratings) && recipe.ratings.length > 0) {
                avgRating = recipe.ratings.reduce((sum, item) => sum + item.rating, 0) / recipe.ratings.length;
            }
        }

        res.status(200).json({
            ratingsWithComments,
            ratingCounts,
            avgRating: parseFloat(avgRating.toFixed(1))
        });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Check if user has already rated a recipe
const getUserRating = async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    try {
        // First check in Rating collection
        let rating = await Rating.findOne({ recipeId, userId });
        
        // If not found, check in recipe.ratings array
        if (!rating) {
            const recipe = await Recipe.findById(recipeId);
            if (recipe && Array.isArray(recipe.ratings)) {
                const userRating = recipe.ratings.find(r => 
                    r.userId && r.userId.toString() === userId);
                
                if (userRating) {
                    rating = {
                        rating: userRating.rating,
                        comment: userRating.comment || "",
                        createdAt: userRating.createdAt
                    };
                }
            }
        }
        
        if (rating) {
            res.status(200).json(rating);
        } else {
            res.status(404).json({ error: 'Rating not found' });
        }
    } catch (error) {
        console.error('Error fetching user rating:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addRating,
    getRecipeRatings,
    getUserRating
};