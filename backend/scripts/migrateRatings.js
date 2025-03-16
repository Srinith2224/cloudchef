const mongoose = require('mongoose');
const Recipe = require('../models/RecipeModel');
const Rating = require('../models/RatingModel');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to database for migration'))
  .catch((error) => console.error('Database connection error:', error));

const migrateRatings = async () => {
  try {
    console.log('Starting ratings migration...');
    
    // Find all recipes
    const recipes = await Recipe.find({});
    console.log(`Found ${recipes.length} recipes to check`);
    
    for (const recipe of recipes) {
      try {
        // Check if ratings is an array
        if (Array.isArray(recipe.ratings)) {
          console.log(`Converting ratings for recipe: ${recipe._id} - ${recipe.title}`);

          // Create Rating documents for each rating in the array
          for (const oldRating of recipe.ratings) {
            if (oldRating.userId && oldRating.rating) {
              await Rating.findOneAndUpdate(
                { recipeId: recipe._id, userId: oldRating.userId },
                {
                  userName: oldRating.userName || 'User',
                  rating: oldRating.rating,
                  comment: oldRating.comment || "",
                  createdAt: oldRating.createdAt || new Date()
                },
                { upsert: true, new: true }
              );
            }
          }

          // Now calculate average rating
          const allRatings = await Rating.find({ recipeId: recipe._id });
          const avgRating = allRatings.length > 0 ?
            allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length : 0;
          
          // Update the recipe document with new ratings structure
          await Recipe.updateOne(
            { _id: recipe._id },
            {
              $unset: { ratings: "" },
              $set: {
                ratings: {
                  avg: parseFloat(avgRating.toFixed(1)),
                  count: allRatings.length
                }
              }
            }
          );
          
          console.log(`Updated recipe ${recipe._id} with avg rating ${avgRating.toFixed(1)} from ${allRatings.length} ratings`);
        }
        else if (!recipe.ratings || typeof recipe.ratings !== 'object') {
          // If ratings doesn't exist or isn't an object, initialize it
          await Recipe.updateOne(
            { _id: recipe._id },
            {
              $set: {
                ratings: {
                  avg: 0,
                  count: 0
                }
              }
            }
          );
          console.log(`Initialized ratings for recipe ${recipe._id}`);
        }
      } catch (err) {
        console.error(`Error processing recipe ${recipe._id}:`, err);
      }
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateRatings();