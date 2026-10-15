const User = require('../models/UserModel');
const Recipe = require('../models/RecipeModel');
const { fileUrl, deleteStoredFile } = require('../config/uploads');
const { withRating, LIST_FIELDS } = require('./recipeController');
const { authPayload } = require('./authController');
const { HttpError, asyncHandler, assertId } = require('../utils/http');

const PUBLIC_FIELDS = 'firstName lastName profilePhoto about region featuredRecipe followers following createdAt';

const isSelfOrAdmin = (req, id) => req.userId === String(id) || req.userRole === 'admin';

// GET /api/users/:id  (own account, full details)
const getUserById = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'user ID');
  if (!isSelfOrAdmin(req, req.params.id)) throw new HttpError(403, 'You can only view your own account details.');
  const user = await User.findById(req.params.id).select('-password -googleId');
  if (!user) throw new HttpError(404, 'Account not found.');
  res.status(200).json(user);
});

// PATCH /api/users/:id   (multipart: firstName, lastName, about, region, profilePhoto file)
const updateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    assertId(id, 'user ID');
    if (!isSelfOrAdmin(req, id)) throw new HttpError(403, 'You can only edit your own profile.');

    const user = await User.findById(id);
    if (!user) throw new HttpError(404, 'Account not found.');

    // Only these fields can change here. Email and password have their own verified flows.
    const fields = { firstName: 60, lastName: 60, about: 500, region: 80 };
    for (const [field, max] of Object.entries(fields)) {
      if (typeof req.body[field] === 'string') {
        const value = req.body[field].trim().slice(0, max);
        if ((field === 'firstName' || field === 'lastName') && !value) continue; // names can't be blank
        user[field] = value;
      }
    }

    const oldPhoto = user.profilePhoto;
    if (req.file) user.profilePhoto = fileUrl(req.file);
    if (req.body.removePhoto === 'true') user.profilePhoto = '';

    await user.save();
    if (oldPhoto && oldPhoto !== user.profilePhoto) await deleteStoredFile(oldPhoto);

    // Keep the author name on their recipes in sync
    await Recipe.updateMany(
      { 'createdBy._id': user._id },
      { $set: { 'createdBy.firstName': user.firstName, 'createdBy.lastName': user.lastName } }
    );

    const { token, ...session } = authPayload(user);
    res.status(200).json({ ...session, about: user.about || '', region: user.region || '' });
  } catch (error) {
    if (req.file) await deleteStoredFile(fileUrl(req.file));
    throw error;
  }
});

// POST /api/users/save-recipe  { recipeId }
const saveRecipe = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  assertId(recipeId, 'recipe ID');
  if (!(await Recipe.exists({ _id: recipeId }))) throw new HttpError(404, 'This recipe does not exist or was deleted.');
  await User.updateOne({ _id: req.userId }, { $addToSet: { savedRecipes: recipeId } });
  res.status(200).json({ message: 'Saved', saved: true });
});

// DELETE /api/users/delete-saved-recipe  { recipeId }
const deleteSavedRecipe = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  assertId(recipeId, 'recipe ID');
  await User.updateOne({ _id: req.userId }, { $pull: { savedRecipes: recipeId } });
  res.status(200).json({ message: 'Removed from saved', saved: false });
});

// GET /api/users/:userId/saved-recipes  (own list only)
const getSavedRecipes = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  assertId(userId, 'user ID');
  if (!isSelfOrAdmin(req, userId)) throw new HttpError(403, 'Saved recipes are private.');

  const user = await User.findById(userId).populate({ path: 'savedRecipes', select: LIST_FIELDS });
  if (!user) throw new HttpError(404, 'Account not found.');
  res.status(200).json(user.savedRecipes.filter(Boolean).map(withRating));
});

// GET /api/users/saved-ids  (just the ids, for quick "is saved" checks)
const getSavedIds = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('savedRecipes');
  res.status(200).json((user?.savedRecipes || []).map(String));
});

// POST /api/users/follow/:id
const followUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertId(id, 'user ID');
  if (id === req.userId) throw new HttpError(400, "You can't follow yourself.");
  if (!(await User.exists({ _id: id }))) throw new HttpError(404, 'This cook does not exist.');

  await User.updateOne({ _id: id }, { $addToSet: { followers: req.userId } });
  await User.updateOne({ _id: req.userId }, { $addToSet: { following: id } });
  const target = await User.findById(id).select('followers');
  res.status(200).json({ isFollowing: true, followerCount: target.followers.length });
});

// POST /api/users/unfollow/:id
const unfollowUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertId(id, 'user ID');
  await User.updateOne({ _id: id }, { $pull: { followers: req.userId } });
  await User.updateOne({ _id: req.userId }, { $pull: { following: id } });
  const target = await User.findById(id).select('followers');
  res.status(200).json({ isFollowing: false, followerCount: target ? target.followers.length : 0 });
});

// GET /api/users/profile/:id   (public)
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertId(id, 'user ID');

  const user = await User.findById(id).select(PUBLIC_FIELDS).populate({ path: 'featuredRecipe', select: LIST_FIELDS });
  if (!user) throw new HttpError(404, 'This cook does not exist.');

  const recipes = await Recipe.find({ 'createdBy._id': id }).select(LIST_FIELDS).sort({ createdAt: -1 });
  const data = user.toObject();
  const followers = (data.followers || []).map(String);

  res.status(200).json({
    _id: data._id,
    firstName: data.firstName,
    lastName: data.lastName,
    profilePhoto: data.profilePhoto || '',
    about: data.about || '',
    region: data.region || '',
    createdAt: data.createdAt,
    featuredRecipe: data.featuredRecipe ? withRating(data.featuredRecipe) : null,
    followerCount: followers.length,
    followingCount: (data.following || []).length,
    isFollowing: Boolean(req.userId && followers.includes(req.userId)),
    recipes: recipes.map(withRating)
  });
});

const listPeople = (field) => asyncHandler(async (req, res) => {
  assertId(req.params.id, 'user ID');
  const user = await User.findById(req.params.id).populate(field, 'firstName lastName profilePhoto');
  if (!user) throw new HttpError(404, 'This cook does not exist.');
  res.status(200).json(user[field].filter(Boolean));
});

// POST /api/users/set-featured-recipe  { recipeId }  (empty = clear)
const setFeaturedRecipe = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  if (!recipeId) {
    await User.updateOne({ _id: req.userId }, { $unset: { featuredRecipe: '' } });
    return res.status(200).json({ featuredRecipe: null });
  }
  assertId(recipeId, 'recipe ID');
  const recipe = await Recipe.findById(recipeId).select('createdBy');
  if (!recipe || String(recipe.createdBy._id) !== req.userId) throw new HttpError(403, 'You can only feature your own recipes.');
  await User.updateOne({ _id: req.userId }, { featuredRecipe: recipeId });
  res.status(200).json({ featuredRecipe: recipeId });
});

module.exports = {
  updateUserProfile,
  getUserById,
  saveRecipe,
  getSavedRecipes,
  getSavedIds,
  deleteSavedRecipe,
  followUser,
  unfollowUser,
  getUserProfile,
  getFollowers: listPeople('followers'),
  getFollowing: listPeople('following'),
  setFeaturedRecipe
};
