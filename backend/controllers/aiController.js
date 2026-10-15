const { generateFromText, generateFromImage, isAiConfigured } = require('../services/aiRecipeService');
const { HttpError, asyncHandler } = require('../utils/http');

const readOptions = (body) => {
  const servings = Math.min(20, Math.max(1, parseInt(body.servings ?? body.servingSize, 10) || 2));
  const clip = (v) => String(v || '').trim().slice(0, 120);
  return {
    servings,
    cuisine: clip(body.cuisine),
    difficulty: clip(body.difficulty),
    dietary: clip(body.dietary ?? body.dietaryPreferences)
  };
};

const friendlyAiError = (error) => {
  if (error.status) return error; // our own messages
  const text = String(error.message || '');
  if (/API key|permission|401|403/i.test(text)) return new HttpError(503, 'The AI key is missing or wrong. Check GEMINI_API_KEY in the backend .env.');
  if (/quota|429|rate/i.test(text)) return new HttpError(429, 'The AI is busy right now. Try again in a minute.');
  if (/not found|404/i.test(text)) return new HttpError(503, 'The AI model name is wrong. Check GEMINI_MODEL in the backend .env.');
  console.error('AI error:', error);
  return new HttpError(502, 'The AI could not create a recipe this time. Try again.');
};

// GET /api/ai/status
const getStatus = (req, res) => res.status(200).json({ enabled: isAiConfigured() });

// POST /api/ai/recipe-from-text  { ingredients: string[] | string, servings, cuisine, difficulty, dietary }
const recipeFromText = asyncHandler(async (req, res) => {
  const raw = Array.isArray(req.body.ingredients) ? req.body.ingredients : String(req.body.ingredients || '').split(',');
  const ingredients = raw.map((i) => String(i).trim()).filter(Boolean).slice(0, 30).map((i) => i.slice(0, 60));
  if (!ingredients.length) throw new HttpError(400, 'List at least one ingredient.');

  try {
    const recipe = await generateFromText({ ingredients, ...readOptions(req.body) });
    res.status(200).json({ recipe });
  } catch (error) {
    throw friendlyAiError(error);
  }
});

// POST /api/ai/recipe-from-image  (multipart: image + options)
const recipeFromImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Add a photo of your ingredients.');
  try {
    const recipe = await generateFromImage(readOptions(req.body), req.file);
    res.status(200).json({ recipe });
  } catch (error) {
    throw friendlyAiError(error);
  }
});

module.exports = { getStatus, recipeFromText, recipeFromImage };
