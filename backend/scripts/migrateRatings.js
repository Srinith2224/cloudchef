/*
 * Moves old ratings that were stored inside recipe documents into the Rating
 * collection, then caches ratingAvg / ratingCount on every recipe.
 * Safe to run more than once.
 *
 *   npm run migrate-ratings
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Recipe = require('../models/RecipeModel');
const Rating = require('../models/RatingModel');
const User = require('../models/UserModel');
const { refreshRecipeRating } = require('../controllers/ratingController');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const recipes = await Recipe.find({}).select('ratings createdBy');
  let moved = 0;

  for (const recipe of recipes) {
    for (const old of recipe.ratings || []) {
      if (!old.userId || !old.rating) continue;
      if (String(old.userId) === String(recipe.createdBy._id)) continue;
      const exists = await Rating.exists({ recipeId: recipe._id, userId: old.userId });
      if (exists) continue;
      const user = await User.findById(old.userId).select('firstName lastName');
      await Rating.create({
        recipeId: recipe._id,
        userId: old.userId,
        userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'CloudChef cook',
        rating: old.rating,
        comment: old.comment || ''
      });
      moved += 1;
    }
    await refreshRecipeRating(recipe._id);
  }

  console.log(`Checked ${recipes.length} recipes, moved ${moved} old ratings.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
