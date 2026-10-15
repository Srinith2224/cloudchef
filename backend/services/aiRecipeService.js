/*
 * Recipe generation with Google Gemini.
 * Needs GEMINI_API_KEY in .env. GEMINI_MODEL is optional.
 */
const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = 'gemini-3.8-flash';
const UNITS = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'packet', 'piece', 'slice'];

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

const isAiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const RECIPE_SHAPE = `Return ONLY a JSON object with exactly these keys:
{
  "title": string,                       // short, appetising name
  "description": string,                 // 1-2 sentences
  "servings": number,
  "totalTime": { "hours": number, "minutes": number },
  "ingredients": [ { "name": string, "quantity": string, "unit": one of ${JSON.stringify(UNITS)} } ],
  "steps": [ { "text": string, "timer": number } ],   // timer = minutes this step takes, 0 if none
  "tags": [string],                      // e.g. cuisine, meal type, "Easy"/"Medium"/"Hard", dietary labels
  "tips": [string]                       // 0-3 short tips
}
Use metric quantities. Each step is one clear action. Do not wrap the JSON in markdown.`;

const buildTextPrompt = ({ ingredients, servings, cuisine, difficulty, dietary }) => `You are an experienced home-cooking chef.
Create one realistic recipe that mainly uses these ingredients: ${ingredients.join(', ')}.
You may add common pantry staples (salt, oil, spices, water).
Servings: ${servings}. Cuisine: ${cuisine || 'any'}. Difficulty: ${difficulty || 'any'}. Dietary needs: ${dietary || 'none'}.
${RECIPE_SHAPE}`;

const buildImagePrompt = ({ servings, cuisine, difficulty, dietary }) => `You are an experienced home-cooking chef.
Look at this photo of someone's fridge, pantry or ingredients. First identify the edible ingredients you can clearly see.
Then create one realistic recipe that uses mainly those ingredients (pantry staples are allowed).
Servings: ${servings}. Cuisine: ${cuisine || 'any'}. Difficulty: ${difficulty || 'any'}. Dietary needs: ${dietary || 'none'}.
Add one extra key "detectedIngredients": [string] listing what you saw.
If the photo has no food at all, return {"error": "No ingredients found in this photo"}.
${RECIPE_SHAPE}`;

const extractJson = (text) => {
  if (!text) throw new Error('The AI returned an empty answer.');
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('The AI answer was not valid JSON.');
  }
};

const clampInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Makes sure whatever the model returned matches the shape our recipe form expects. */
const normalizeRecipe = (raw, fallbackServings) => {
  if (!raw || typeof raw !== 'object') throw new Error('The AI answer was empty.');
  if (raw.error) {
    const err = new Error(raw.error);
    err.status = 422;
    err.expose = true;
    throw err;
  }

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((ing) => (typeof ing === 'string' ? { name: ing, quantity: '1', unit: 'piece' } : ing))
    .filter((ing) => ing && ing.name)
    .map((ing) => ({
      name: String(ing.name).trim().slice(0, 80),
      quantity: String(ing.quantity ?? '1').trim().slice(0, 20) || '1',
      unit: UNITS.includes(String(ing.unit).toLowerCase()) ? String(ing.unit).toLowerCase() : 'piece'
    }));

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((step) => (typeof step === 'string' ? { text: step } : step))
    .filter((step) => step && step.text)
    .map((step) => ({
      text: String(step.text).replace(/^\s*\d+[.)]\s*/, '').trim(),
      timer: clampInt(step.timer, 0, 600, 0)
    }));

  if (!ingredients.length || !steps.length) throw new Error('The AI recipe was incomplete. Try again.');

  return {
    title: String(raw.title || 'Chef’s special').trim().slice(0, 100),
    description: String(raw.description || '').trim().slice(0, 500),
    servings: clampInt(raw.servings, 1, 50, fallbackServings),
    totalTime: {
      hours: clampInt(raw.totalTime?.hours, 0, 48, 0),
      minutes: clampInt(raw.totalTime?.minutes, 0, 59, 30)
    },
    ingredients,
    steps,
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 8),
    tips: (Array.isArray(raw.tips) ? raw.tips : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 3),
    detectedIngredients: (Array.isArray(raw.detectedIngredients) ? raw.detectedIngredients : []).map(String).slice(0, 20)
  };
};

const callGemini = async (contents) => {
  const ai = getClient();
  if (!ai) {
    const err = new Error('AI recipes are not set up yet. Add GEMINI_API_KEY to the backend .env file.');
    err.status = 503;
    err.expose = true;
    throw err;
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents,
    config: {
      temperature: 0.8,
      responseMimeType: 'application/json'
    }
  });
  return response.text;
};

const generateFromText = async (options) => {
  const text = await callGemini(buildTextPrompt(options));
  return normalizeRecipe(extractJson(text), options.servings);
};

const generateFromImage = async (options, file) => {
  const contents = [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } },
        { text: buildImagePrompt(options) }
      ]
    }
  ];
  const text = await callGemini(contents);
  return normalizeRecipe(extractJson(text), options.servings);
};

module.exports = { generateFromText, generateFromImage, isAiConfigured, normalizeRecipe, extractJson };
