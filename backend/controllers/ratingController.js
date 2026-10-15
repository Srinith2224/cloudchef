const Rating = require('../models/RatingModel');
const Recipe = require('../models/RecipeModel');
const User = require('../models/UserModel');
const { HttpError, asyncHandler, assertId } = require('../utils/http');

/** Recomputes and caches a recipe's rating average and count. */
const refreshRecipeRating = async (recipeId) => {
  const ratings = await Rating.find({ recipeId }).select('rating').lean();
  const ratingCount = ratings.length;
  const ratingAvg = ratingCount ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10) / 10 : 0;
  await Recipe.updateOne({ _id: recipeId }, { $set: { ratingAvg, ratingCount } });
  return { avgRating: ratingAvg, ratingCount };
};

// POST /api/ratings  { recipeId, rating, comment }
const addRating = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim().slice(0, 1000);

  assertId(recipeId, 'recipe ID');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Pick a rating from 1 to 5 stars.');

  const recipe = await Recipe.findById(recipeId).select('createdBy');
  if (!recipe) throw new HttpError(404, 'This recipe does not exist or was deleted.');
  if (String(recipe.createdBy._id) === req.userId) throw new HttpError(403, "You can't rate your own recipe.");

  const user = await User.findById(req.userId).select('firstName lastName');
  if (!user) throw new HttpError(404, 'Account not found.');

  const saved = await Rating.findOneAndUpdate(
    { recipeId, userId: req.userId },
    { $set: { rating, comment, userName: `${user.firstName} ${user.lastName}`.trim() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const summary = await refreshRecipeRating(recipeId);
  res.status(200).json({ rating: saved, ...summary });
});

// GET /api/ratings/recipe/:recipeId   (public)
const getRecipeRatings = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  assertId(recipeId, 'recipe ID');

  const all = await Rating.find({ recipeId }).sort({ updatedAt: -1 }).lean();

  const distribution = [0, 0, 0, 0, 0]; // index 0 = 1 star
  all.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1] += 1;
  });
  const count = all.length;
  const avg = count ? all.reduce((s, r) => s + r.rating, 0) / count : 0;

  // Attach reviewer photos for a friendlier list
  const reviewerIds = all.filter((r) => r.comment).map((r) => r.userId);
  const reviewers = await User.find({ _id: { $in: reviewerIds } }).select('profilePhoto').lean();
  const photoById = Object.fromEntries(reviewers.map((u) => [String(u._id), u.profilePhoto || '']));

  res.status(200).json({
    avgRating: Math.round(avg * 10) / 10,
    ratingCount: count,
    distribution,
    reviews: all
      .filter((r) => r.comment)
      .map((r) => ({
        _id: r._id,
        userId: r.userId,
        userName: r.userName,
        profilePhoto: photoById[String(r.userId)] || '',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.updatedAt || r.createdAt
      }))
  });
});

// GET /api/ratings/user/recipe/:recipeId
const getUserRating = asyncHandler(async (req, res) => {
  assertId(req.params.recipeId, 'recipe ID');
  const rating = await Rating.findOne({ recipeId: req.params.recipeId, userId: req.userId });
  // 200 with null is easier for the UI than a 404 for "not rated yet"
  res.status(200).json(rating || null);
});

// DELETE /api/ratings/recipe/:recipeId   (remove my rating)
const deleteMyRating = asyncHandler(async (req, res) => {
  assertId(req.params.recipeId, 'recipe ID');
  await Rating.deleteOne({ recipeId: req.params.recipeId, userId: req.userId });
  const summary = await refreshRecipeRating(req.params.recipeId);
  res.status(200).json(summary);
});

module.exports = { addRating, getRecipeRatings, getUserRating, deleteMyRating, refreshRecipeRating };
