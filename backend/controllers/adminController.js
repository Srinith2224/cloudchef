const User = require('../models/UserModel');
const Recipe = require('../models/RecipeModel');
const Rating = require('../models/RatingModel');
const Cart = require('../models/CartModel');
const Calendar = require('../models/CalendarModel');
const Report = require('../models/ReportModel');
const { removeRecipeEverywhere, withRating, LIST_FIELDS } = require('./recipeController');
const { refreshRecipeRating } = require('./ratingController');
const { deleteStoredFile } = require('../config/uploads');
const { HttpError, asyncHandler, assertId } = require('../utils/http');

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [users, recipes, ratings, openReports] = await Promise.all([
    User.countDocuments(),
    Recipe.countDocuments(),
    Rating.countDocuments(),
    Report.countDocuments({ status: 'open' })
  ]);
  res.status(200).json({ users, recipes, ratings, openReports });
});

// GET /api/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('firstName lastName email role profilePhoto createdAt').sort({ createdAt: -1 }).lean();
  const counts = await Recipe.aggregate([{ $group: { _id: '$createdBy._id', count: { $sum: 1 } } }]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.status(200).json(users.map((u) => ({ ...u, recipeCount: byUser[String(u._id)] || 0 })));
});

// PATCH /api/admin/users/:id/role  { role }
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  assertId(id, 'user ID');
  if (!['admin', 'user'].includes(role)) throw new HttpError(400, 'Role must be "admin" or "user".');
  if (id === req.userId && role !== 'admin') throw new HttpError(400, "You can't remove your own admin access.");

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('firstName lastName email role');
  if (!user) throw new HttpError(404, 'Account not found.');
  res.status(200).json(user);
});

// DELETE /api/admin/users/:id   (removes the user and everything they own)
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertId(id, 'user ID');
  if (id === req.userId) throw new HttpError(400, "You can't delete your own account from the admin panel.");

  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'Account not found.');

  const recipes = await Recipe.find({ 'createdBy._id': id });
  for (const recipe of recipes) await removeRecipeEverywhere(recipe);

  // Their ratings on other people's recipes: delete, then refresh those averages
  const theirRatings = await Rating.find({ userId: id }).select('recipeId');
  await Rating.deleteMany({ userId: id });
  await Promise.all([...new Set(theirRatings.map((r) => String(r.recipeId)))].map((rid) => refreshRecipeRating(rid)));

  await Promise.all([
    Cart.deleteOne({ userId: id }),
    Calendar.deleteOne({ userId: id }),
    Report.deleteMany({ reportedBy: id }),
    User.updateMany({}, { $pull: { followers: user._id, following: user._id } }),
    deleteStoredFile(user.profilePhoto)
  ]);
  await User.deleteOne({ _id: id });

  res.status(200).json({ message: 'Account and all its content deleted', recipesDeleted: recipes.length });
});

// GET /api/admin/recipes
const getAllRecipes = asyncHandler(async (req, res) => {
  const recipes = await Recipe.find({}).select(LIST_FIELDS).sort({ createdAt: -1 });
  res.status(200).json(recipes.map(withRating));
});

// DELETE /api/admin/recipes/:id
const deleteAnyRecipe = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'recipe ID');
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw new HttpError(404, 'Recipe not found.');
  await removeRecipeEverywhere(recipe);
  await Report.updateMany({ reportedItem: recipe._id }, { status: 'resolved' });
  res.status(200).json({ message: 'Recipe deleted' });
});

// GET /api/admin/reports
const getReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({}).sort({ status: 1, createdAt: -1 }).populate('reportedBy', 'firstName lastName email').lean();
  const recipeIds = reports.filter((r) => r.type === 'recipe').map((r) => r.reportedItem);
  const recipes = await Recipe.find({ _id: { $in: recipeIds } }).select('title mainImage').lean();
  const byId = Object.fromEntries(recipes.map((r) => [String(r._id), r]));
  res.status(200).json(reports.map((r) => ({ ...r, item: byId[String(r.reportedItem)] || null })));
});

// PATCH /api/admin/reports/:id  { status }
const updateReport = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'report ID');
  const status = req.body.status === 'open' ? 'open' : 'resolved';
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!report) throw new HttpError(404, 'Report not found.');
  res.status(200).json(report);
});

module.exports = {
  getStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRecipes,
  deleteAnyRecipe,
  getReports,
  updateReport
};
