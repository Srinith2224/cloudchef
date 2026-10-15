const Recipe = require('../models/RecipeModel');
const User = require('../models/UserModel');
const Rating = require('../models/RatingModel');
const Calendar = require('../models/CalendarModel');
const { estimateRecipeNutrition } = require('../services/nutritionService');
const { fileUrl, deleteStoredFile } = require('../config/cloudinaryConfig');
const { HttpError, asyncHandler, assertId, escapeRegex } = require('../utils/http');

const UNITS = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'packet', 'piece', 'slice'];
const LIST_FIELDS = 'title mainImage description totalTime tags createdBy ratingAvg ratingCount ratings.rating ingredients.name servings createdAt';

/** Adds avgRating/ratingCount, falling back to the legacy embedded array for old documents. */
const withRating = (doc) => {
  const recipe = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  let avg = recipe.ratingAvg || 0;
  let count = recipe.ratingCount || 0;
  if (!count && Array.isArray(recipe.ratings) && recipe.ratings.length) {
    count = recipe.ratings.length;
    avg = recipe.ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count;
  }
  delete recipe.ratings;
  recipe.avgRating = Math.round(avg * 10) / 10;
  recipe.ratingCount = count;
  return recipe;
};

const toInt = (value, min, max, fallback = 0) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

/**
 * Reads the recipe from the request. The frontend sends one JSON field called
 * "recipe" plus files named mainImage, stepImage-<index> and stepVideo-<index>.
 */
const parseRecipeInput = (req) => {
  let input;
  try {
    input = typeof req.body.recipe === 'string' ? JSON.parse(req.body.recipe) : req.body.recipe || req.body;
  } catch {
    throw new HttpError(400, 'Recipe data is not valid JSON.');
  }

  const title = cleanText(input.title, 120);
  const description = cleanText(input.description, 1500);
  if (!title) throw new HttpError(400, 'Add a recipe title.');
  if (!description) throw new HttpError(400, 'Add a short description.');

  const totalTime = {
    hours: toInt(input.totalTime?.hours, 0, 72),
    minutes: toInt(input.totalTime?.minutes, 0, 59)
  };
  if (totalTime.hours === 0 && totalTime.minutes === 0) throw new HttpError(400, 'Add the total cooking time.');

  const ingredients = (Array.isArray(input.ingredients) ? input.ingredients : [])
    .map((ing) => ({
      name: cleanText(ing?.name, 80),
      quantity: cleanText(ing?.quantity, 20),
      unit: UNITS.includes(ing?.unit) ? ing.unit : ''
    }))
    .filter((ing) => ing.name && ing.quantity);
  if (!ingredients.length) throw new HttpError(400, 'Add at least one ingredient with a quantity.');

  const steps = (Array.isArray(input.steps) ? input.steps : [])
    .map((step) => ({
      text: cleanText(step?.text ?? step?.description, 2000),
      ingredient: cleanText(step?.ingredient, 80),
      quantity: cleanText(step?.quantity, 40),
      alternate: cleanText(step?.alternate, 120),
      timer: toInt(step?.timer, 0, 600),
      image: typeof step?.image === 'string' ? step.image : '',
      video: typeof step?.video === 'string' ? step.video : ''
    }))
    .filter((step) => step.text);
  if (!steps.length) throw new HttpError(400, 'Add at least one cooking step.');
  steps.forEach((step, i) => { step.stepNumber = i + 1; });

  const tags = [...new Set((Array.isArray(input.tags) ? input.tags : []).map((t) => cleanText(t, 30)).filter(Boolean))].slice(0, 20);

  // Use the cook's numbers if given, otherwise estimate from ingredients
  const estimate = estimateRecipeNutrition(ingredients);
  const n = input.nutrition || {};
  const nutrition = {
    calories: toInt(n.calories, 0, 50000, estimate.calories),
    fat: toInt(n.fat, 0, 5000, estimate.fat),
    protein: toInt(n.protein, 0, 5000, estimate.protein),
    carbs: toInt(n.carbs, 0, 5000, estimate.carbs)
  };

  return {
    title,
    description,
    totalTime,
    servings: toInt(input.servings, 1, 50, 2),
    ingredients,
    steps,
    tags,
    nutrition,
    removeMainImage: Boolean(input.removeMainImage)
  };
};

/** Applies uploaded files to the parsed recipe (main image and per-step media). */
const applyUploads = (req, data) => {
  for (const file of req.files || []) {
    const url = fileUrl(file);
    if (file.fieldname === 'mainImage') {
      data.mainImage = url;
      continue;
    }
    const match = file.fieldname.match(/^step(Image|Video)-(\d+)$/);
    if (!match) continue;
    const step = data.steps[Number(match[2])];
    if (!step) continue;
    if (match[1] === 'Image') step.image = url;
    else step.video = url;
  }
};

const mediaUrls = (recipe) => {
  const urls = [];
  if (recipe.mainImage) urls.push({ url: recipe.mainImage, type: 'image' });
  for (const step of recipe.steps || []) {
    if (step.image) urls.push({ url: step.image, type: 'image' });
    if (step.video) urls.push({ url: step.video, type: 'video' });
  }
  return urls;
};

/** Deletes uploaded files from a failed request so they don't pile up. */
const discardUploads = (req) => Promise.all((req.files || []).map((f) => deleteStoredFile(fileUrl(f), f.mimetype.startsWith('video/') ? 'video' : 'image')));

const canEdit = (req, recipe) => req.userRole === 'admin' || String(recipe.createdBy._id) === req.userId;

// GET /api/recipes
const getRecipes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }, { 'ingredients.name': rx }];
  }
  const recipes = await Recipe.find(filter).select(LIST_FIELDS).sort({ createdAt: -1 }).limit(500);
  res.status(200).json(recipes.map(withRating));
});

// GET /api/recipes/search?query=
const searchRecipes = asyncHandler(async (req, res) => {
  const query = String(req.query.query || req.query.q || '').trim().slice(0, 80);
  if (!query) return res.status(200).json([]);
  const rx = new RegExp(escapeRegex(query), 'i');
  const results = await Recipe.find({ $or: [{ title: rx }, { tags: rx }, { 'ingredients.name': rx }] })
    .select(LIST_FIELDS)
    .sort({ createdAt: -1 })
    .limit(100);
  res.status(200).json(results.map(withRating));
});

// GET /api/recipes/:id
const getRecipe = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'recipe ID');
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw new HttpError(404, 'This recipe does not exist or was deleted.');

  const data = withRating(recipe);
  const author = await User.findById(recipe.createdBy._id).select('firstName lastName profilePhoto');
  if (author) {
    data.createdBy = { _id: author._id, firstName: author.firstName, lastName: author.lastName, profilePhoto: author.profilePhoto || '' };
  }
  res.status(200).json(data);
});

// GET /api/recipes/user/:userId
const getRecipesByUserId = asyncHandler(async (req, res) => {
  assertId(req.params.userId, 'user ID');
  const recipes = await Recipe.find({ 'createdBy._id': req.params.userId }).select(LIST_FIELDS).sort({ createdAt: -1 });
  res.status(200).json(recipes.map(withRating));
});

// POST /api/recipes
const createRecipe = asyncHandler(async (req, res) => {
  try {
    const data = parseRecipeInput(req);
    applyUploads(req, data);
    delete data.removeMainImage;

    const user = await User.findById(req.userId).select('firstName lastName');
    if (!user) throw new HttpError(404, 'Account not found.');

    const recipe = await Recipe.create({
      ...data,
      createdBy: { _id: user._id, firstName: user.firstName, lastName: user.lastName || '-' }
    });
    res.status(201).json(withRating(recipe));
  } catch (error) {
    await discardUploads(req);
    throw error;
  }
});

// PATCH /api/recipes/:id
const updateRecipe = asyncHandler(async (req, res) => {
  try {
    assertId(req.params.id, 'recipe ID');
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) throw new HttpError(404, 'This recipe does not exist or was deleted.');
    if (!canEdit(req, recipe)) throw new HttpError(403, 'You can only edit your own recipes.');

    const data = parseRecipeInput(req);
    const oldMedia = mediaUrls(recipe);
    const { removeMainImage } = data;
    delete data.removeMainImage;

    data.mainImage = removeMainImage ? '' : recipe.mainImage;
    applyUploads(req, data);

    recipe.set(data);
    await recipe.save();

    // Remove files that are no longer used by this recipe
    const stillUsed = new Set(mediaUrls(recipe).map((m) => m.url));
    await Promise.all(oldMedia.filter((m) => !stillUsed.has(m.url)).map((m) => deleteStoredFile(m.url, m.type)));

    res.status(200).json(withRating(recipe));
  } catch (error) {
    await discardUploads(req);
    throw error;
  }
});

// DELETE /api/recipes/:id
const deleteRecipe = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'recipe ID');
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw new HttpError(404, 'This recipe does not exist or was deleted.');
  if (!canEdit(req, recipe)) throw new HttpError(403, 'You can only delete your own recipes.');

  await removeRecipeEverywhere(recipe);
  res.status(200).json({ message: 'Recipe deleted', _id: recipe._id });
});

/** Deletes a recipe and every reference to it. Also used by the admin tools. */
const removeRecipeEverywhere = async (recipe) => {
  await Recipe.deleteOne({ _id: recipe._id });
  await Promise.all([
    Rating.deleteMany({ recipeId: recipe._id }),
    User.updateMany({ savedRecipes: recipe._id }, { $pull: { savedRecipes: recipe._id } }),
    User.updateMany({ featuredRecipe: recipe._id }, { $unset: { featuredRecipe: '' } }),
    Calendar.updateMany({ 'scheduledRecipes.recipeId': recipe._id }, { $pull: { scheduledRecipes: { recipeId: recipe._id } } }),
    ...mediaUrls(recipe).map((m) => deleteStoredFile(m.url, m.type))
  ]);
};

// POST /api/recipes/calculate-nutrition
const calculateNutrition = asyncHandler(async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients)) throw new HttpError(400, 'Send a list of ingredients.');
  res.status(200).json(estimateRecipeNutrition(ingredients.slice(0, 100)));
});

module.exports = {
  getRecipes,
  getRecipe,
  createRecipe,
  deleteRecipe,
  updateRecipe,
  getRecipesByUserId,
  searchRecipes,
  calculateNutrition,
  removeRecipeEverywhere,
  withRating,
  parseRecipeInput,
  LIST_FIELDS
};
