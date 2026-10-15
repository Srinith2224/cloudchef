/*
 * Offline nutrition estimates.
 *
 * Values are per 100 g (USDA-style averages). Each ingredient is converted to
 * grams using its unit, then scaled. This is an estimate for home cooks, not a
 * lab measurement, and the UI says so.
 */
const { parseQuantity } = require('../utils/http');

// [calories, fat, protein, carbs] per 100 g
const PER_100G = {
  // grains & starches
  'basmati rice': [130, 0.3, 2.7, 28], rice: [130, 0.3, 2.7, 28], 'brown rice': [112, 0.9, 2.3, 24],
  pasta: [158, 0.9, 5.8, 31], spaghetti: [158, 0.9, 5.8, 31], noodles: [138, 2.1, 4.5, 25],
  flour: [364, 1, 10, 76], 'wheat flour': [340, 2.5, 13, 72], maida: [364, 1, 10, 76], atta: [340, 2.5, 13, 72],
  bread: [265, 3.2, 9, 49], oats: [389, 6.9, 17, 66], potato: [77, 0.1, 2, 17], 'sweet potato': [86, 0.1, 1.6, 20],
  semolina: [360, 1.1, 13, 73], rava: [360, 1.1, 13, 73], poha: [350, 1, 7, 77], quinoa: [120, 1.9, 4.4, 21],
  // proteins
  chicken: [165, 3.6, 31, 0], 'chicken breast': [165, 3.6, 31, 0], mutton: [294, 21, 25, 0], lamb: [294, 21, 25, 0],
  beef: [250, 15, 26, 0], pork: [242, 14, 27, 0], fish: [206, 12, 22, 0], salmon: [208, 13, 20, 0],
  prawn: [99, 0.3, 24, 0.2], shrimp: [99, 0.3, 24, 0.2], egg: [143, 9.5, 12.6, 0.7], tofu: [76, 4.8, 8, 1.9],
  paneer: [265, 20, 18, 1.2], dal: [116, 0.4, 9, 20], lentil: [116, 0.4, 9, 20], chickpea: [164, 2.6, 8.9, 27],
  chana: [164, 2.6, 8.9, 27], rajma: [127, 0.5, 8.7, 23], 'kidney beans': [127, 0.5, 8.7, 23],
  // dairy
  milk: [42, 1, 3.4, 5], yogurt: [59, 3.3, 3.5, 5], curd: [61, 3.3, 3.5, 4.7], cream: [340, 36, 2.1, 2.8],
  cheese: [402, 33, 25, 1.3], butter: [717, 81, 0.9, 0.1], ghee: [900, 100, 0, 0],
  // fats, sugar, nuts
  oil: [884, 100, 0, 0], 'olive oil': [884, 100, 0, 0], sugar: [387, 0, 0, 100], jaggery: [383, 0.1, 0.4, 98],
  honey: [304, 0, 0.3, 82], almond: [579, 50, 21, 22], cashew: [553, 44, 18, 30], peanut: [567, 49, 26, 16],
  coconut: [354, 33, 3.3, 15], 'coconut milk': [230, 24, 2.3, 6],
  // vegetables & fruit
  onion: [40, 0.1, 1.1, 9.3], tomato: [18, 0.2, 0.9, 3.9], garlic: [149, 0.5, 6.4, 33], ginger: [80, 0.8, 1.8, 18],
  carrot: [41, 0.2, 0.9, 10], capsicum: [31, 0.3, 1, 6], 'bell pepper': [31, 0.3, 1, 6], spinach: [23, 0.4, 2.9, 3.6],
  palak: [23, 0.4, 2.9, 3.6], broccoli: [34, 0.4, 2.8, 7], cauliflower: [25, 0.3, 1.9, 5], cabbage: [25, 0.1, 1.3, 6],
  peas: [81, 0.4, 5.4, 14], mushroom: [22, 0.3, 3.1, 3.3], cucumber: [15, 0.1, 0.7, 3.6], brinjal: [25, 0.2, 1, 6],
  eggplant: [25, 0.2, 1, 6], okra: [33, 0.2, 1.9, 7], bhindi: [33, 0.2, 1.9, 7], corn: [86, 1.4, 3.3, 19],
  lemon: [29, 0.3, 1.1, 9], banana: [89, 0.3, 1.1, 23], apple: [52, 0.2, 0.3, 14], mango: [60, 0.4, 0.8, 15],
  chili: [40, 0.2, 1.9, 8.8], 'green chili': [40, 0.2, 1.9, 8.8], coriander: [23, 0.5, 2.1, 3.7], mint: [70, 0.9, 3.8, 15],
  // spices (small amounts, but counted)
  turmeric: [312, 3.3, 9.7, 67], cumin: [375, 22, 18, 44], 'garam masala': [251, 9.6, 10, 32], 'chili powder': [282, 14, 13, 50],
  cinnamon: [247, 1.2, 4, 81], cardamom: [311, 6.7, 11, 68], cloves: [274, 13, 6, 66], 'bay leaf': [313, 8.4, 7.6, 75],
  salt: [0, 0, 0, 0], pepper: [251, 3.3, 10, 64], water: [0, 0, 0, 0]
};

// Typical weight in grams of one "piece" of an ingredient
const PIECE_GRAMS = {
  egg: 50, onion: 110, tomato: 120, potato: 170, 'sweet potato': 130, carrot: 60, lemon: 60, banana: 120, apple: 180,
  mango: 200, garlic: 5, chili: 5, 'green chili': 5, 'bay leaf': 0.5, cardamom: 0.5, cloves: 0.2, capsicum: 120,
  'bell pepper': 120, cucumber: 300, 'chicken breast': 170, bread: 30, cinnamon: 2
};

// Grams per unit (liquids assume ~1 g per ml)
const UNIT_GRAMS = { g: 1, kg: 1000, ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5, slice: 30, packet: 100 };

const OIL_LIKE = new Set(['oil', 'olive oil', 'ghee']);

/** Finds the closest known ingredient: exact name, then longest key contained in the name. */
const matchIngredient = (name) => {
  const normalized = String(name || '').toLowerCase().trim().replace(/s\b/g, '');
  if (PER_100G[normalized]) return normalized;
  const plain = String(name || '').toLowerCase().trim();
  if (PER_100G[plain]) return plain;
  const candidates = Object.keys(PER_100G).filter((key) => plain.includes(key) || normalized.includes(key));
  if (candidates.length) return candidates.sort((a, b) => b.length - a.length)[0];
  return null;
};

const toGrams = (key, quantity, unit) => {
  const amount = parseQuantity(quantity);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const u = String(unit || '').toLowerCase();

  if (u === 'piece' || u === '') {
    const pieceWeight = (key && PIECE_GRAMS[key]) || 100;
    return amount * pieceWeight;
  }
  let grams = amount * (UNIT_GRAMS[u] || 100);
  if ((u === 'ml' || u === 'l' || u === 'cup' || u === 'tbsp' || u === 'tsp') && OIL_LIKE.has(key)) grams *= 0.92;
  return grams;
};

/** Nutrition for one ingredient line. Unknown ingredients count as a light vegetable-like item. */
const getNutritionData = (ingredient, quantity, unit) => {
  const key = matchIngredient(ingredient);
  const [cal, fat, protein, carbs] = key ? PER_100G[key] : [50, 0.5, 2, 9];
  const factor = toGrams(key, quantity, unit) / 100;
  return {
    calories: cal * factor,
    fat: fat * factor,
    protein: protein * factor,
    carbs: carbs * factor,
    matched: Boolean(key)
  };
};

/** Totals for a whole recipe plus how many ingredients were recognised. */
const estimateRecipeNutrition = (ingredients = []) => {
  const totals = { calories: 0, fat: 0, protein: 0, carbs: 0 };
  let matched = 0;
  let counted = 0;

  for (const ing of ingredients) {
    if (!ing || !ing.name || !ing.quantity) continue;
    const n = getNutritionData(ing.name, ing.quantity, ing.unit);
    totals.calories += n.calories;
    totals.fat += n.fat;
    totals.protein += n.protein;
    totals.carbs += n.carbs;
    counted += 1;
    if (n.matched) matched += 1;
  }

  return {
    calories: Math.round(totals.calories),
    fat: Math.round(totals.fat),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    matched,
    counted
  };
};

module.exports = { getNutritionData, estimateRecipeNutrition, matchIngredient };
