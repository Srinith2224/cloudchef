const Recipe = require('../models/RecipeModel');
const Rating = require('../models/RatingModel');
const User = require('../models/UserModel');
const { refreshRecipeRating } = require('../controllers/ratingController');

/**
 * The first version of CloudChef kept ratings inside each recipe document.
 * On start-up, move any that are left into the Rating collection and remove
 * them from the recipe. Recipes that were already moved are skipped, so this
 * is quick after the first run.
 */
async function migrateOldRatings() {
  const recipes = await Recipe.collection
    .find({ 'ratings.0': { $exists: true } })
    .project({ ratings: 1, createdBy: 1 })
    .toArray();
  if (!recipes.length) return;

  let moved = 0;
  for (const recipe of recipes) {
    for (const old of recipe.ratings) {
      const rating = Math.round(Number(old.rating));
      if (!old.userId || !(rating >= 1 && rating <= 5)) continue;
      if (String(old.userId) === String(recipe.createdBy?._id)) continue; // cooks can't rate their own recipe
      if (await Rating.exists({ recipeId: recipe._id, userId: old.userId })) continue;

      const user = await User.findById(old.userId).select('firstName lastName');
      const date = old.createdAt || new Date();
      // Inserted directly so the review keeps its original date
      await Rating.collection.insertOne({
        recipeId: recipe._id,
        userId: old.userId,
        userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'CloudChef cook',
        rating,
        comment: old.comment || '',
        createdAt: date,
        updatedAt: date
      });
      moved += 1;
    }
    await refreshRecipeRating(recipe._id);
    await Recipe.collection.updateOne({ _id: recipe._id }, { $unset: { ratings: '' } });
  }
  console.log(`Moved ${moved} ratings from ${recipes.length} older recipes into the new ratings list.`);
}

module.exports = migrateOldRatings;
