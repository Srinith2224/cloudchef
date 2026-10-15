const Calendar = require('../models/CalendarModel');
const Recipe = require('../models/RecipeModel');
const { HttpError, asyncHandler, assertId } = require('../utils/http');

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

/**
 * Dates are calendar days, not moments. We store them at 12:00 UTC so the same
 * day shows up in every time zone (IST users were seeing meals on the wrong day).
 */
const toCalendarDate = (value) => {
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new HttpError(400, 'Pick a valid date.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Pick a valid date.');
  return date;
};

const formatEntries = (calendar) =>
  (calendar?.scheduledRecipes || [])
    .filter((entry) => entry.recipeId)
    .map((entry) => ({
      _id: entry._id,
      recipe: entry.recipeId,
      date: entry.date.toISOString().slice(0, 10),
      mealTime: entry.mealTime
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || MEAL_TIMES.indexOf(a.mealTime) - MEAL_TIMES.indexOf(b.mealTime));

const populated = (userId) =>
  Calendar.findOne({ userId }).populate({ path: 'scheduledRecipes.recipeId', select: 'title mainImage totalTime' });

// POST /api/calendar  { recipeId, date: 'YYYY-MM-DD', mealTime }
const addCalendarEntry = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  assertId(recipeId, 'recipe ID');
  const mealTime = MEAL_TIMES.includes(req.body.mealTime) ? req.body.mealTime : 'Dinner';
  const date = toCalendarDate(req.body.date);

  if (!(await Recipe.exists({ _id: recipeId }))) throw new HttpError(404, 'This recipe does not exist or was deleted.');

  await Calendar.updateOne(
    { userId: req.userId },
    { $push: { scheduledRecipes: { recipeId, date, mealTime } } },
    { upsert: true }
  );

  res.status(201).json(formatEntries(await populated(req.userId)));
});

// GET /api/calendar  (and legacy /api/calendar/:userId — always returns the signed-in user's plan)
const getCalendarEntries = asyncHandler(async (req, res) => {
  if (req.params.userId && req.params.userId !== req.userId) throw new HttpError(403, 'Meal plans are private.');
  res.status(200).json(formatEntries(await populated(req.userId)));
});

// PATCH /api/calendar/:id  { date?, mealTime? }  (move a meal)
const updateCalendarEntry = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'entry ID');
  const calendar = await Calendar.findOne({ userId: req.userId });
  const entry = calendar && calendar.scheduledRecipes.id(req.params.id);
  if (!entry) throw new HttpError(404, 'This meal is no longer in your plan.');

  if (req.body.date) entry.date = toCalendarDate(req.body.date);
  if (MEAL_TIMES.includes(req.body.mealTime)) entry.mealTime = req.body.mealTime;
  await calendar.save();

  res.status(200).json(formatEntries(await populated(req.userId)));
});

// DELETE /api/calendar/:id
const deleteCalendarEntry = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'entry ID');
  await Calendar.updateOne({ userId: req.userId }, { $pull: { scheduledRecipes: { _id: req.params.id } } });
  res.status(200).json(formatEntries(await populated(req.userId)));
});

module.exports = { addCalendarEntry, getCalendarEntries, updateCalendarEntry, deleteCalendarEntry, toCalendarDate };
