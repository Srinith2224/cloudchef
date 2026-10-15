const { parseQuantity, escapeRegex, isValidId } = require('../utils/http');
const { estimateRecipeNutrition, matchIngredient } = require('../services/nutritionService');
const { normalizeRecipe, extractJson } = require('../services/aiRecipeService');
const { toCalendarDate } = require('../controllers/calendarController');

describe('parseQuantity', () => {
  it.each([['2', 2], ['1.5', 1.5], ['1/2', 0.5], ['1 1/2', 1.5], ['2,5', 2.5], [3, 3]])('%s -> %s', (input, out) => {
    expect(parseQuantity(input)).toBeCloseTo(out);
  });
  it('returns NaN for text', () => expect(parseQuantity('a pinch')).toBeNaN());
});

describe('escapeRegex / isValidId', () => {
  it('escapes special characters', () => expect(new RegExp(escapeRegex('a.*(b')).test('a.*(b')).toBe(true));
  it('validates ids', () => {
    expect(isValidId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidId('hello')).toBe(false);
  });
});

describe('nutrition estimate', () => {
  it('matches plurals and longest names', () => {
    expect(matchIngredient('Tomatoes')).toBe('tomato');
    expect(matchIngredient('basmati rice')).toBe('basmati rice');
    expect(matchIngredient('eggs')).toBe('egg');
  });

  it('gives realistic totals', () => {
    const result = estimateRecipeNutrition([
      { name: 'Chicken', quantity: '500', unit: 'g' },
      { name: 'Basmati rice', quantity: '2', unit: 'cup' },
      { name: 'Oil', quantity: '2', unit: 'tbsp' },
      { name: 'Onion', quantity: '2', unit: 'piece' }
    ]);
    // 825 + 624 + ~244 + ~88
    expect(result.calories).toBeGreaterThan(1600);
    expect(result.calories).toBeLessThan(2000);
    expect(result.protein).toBeGreaterThan(160);
    expect(result.matched).toBe(4);
  });

  it('ignores lines without a quantity', () => {
    expect(estimateRecipeNutrition([{ name: 'Salt' }]).counted).toBe(0);
  });
});

describe('AI output normalisation', () => {
  it('strips code fences', () => expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 }));

  it('cleans the recipe into the form shape', () => {
    const recipe = normalizeRecipe({
      title: 'Egg curry',
      ingredients: [{ name: 'Egg', quantity: 4, unit: 'pcs' }, 'Salt'],
      steps: ['1. Boil eggs', { text: 'Make gravy', timer: '10' }],
      totalTime: { hours: 0, minutes: 75 }
    }, 2);
    expect(recipe.ingredients[0]).toEqual({ name: 'Egg', quantity: '4', unit: 'piece' });
    expect(recipe.steps[0].text).toBe('Boil eggs');
    expect(recipe.steps[1].timer).toBe(10);
    expect(recipe.totalTime.minutes).toBe(59);
    expect(recipe.servings).toBe(2);
  });

  it('turns a model error into a 422', () => {
    expect(() => normalizeRecipe({ error: 'No ingredients found in this photo' })).toThrow('No ingredients');
  });
});

describe('calendar dates', () => {
  it('stores the chosen day at noon UTC', () => {
    expect(toCalendarDate('2026-10-20').toISOString()).toBe('2026-10-20T12:00:00.000Z');
  });
  it('rejects bad dates', () => expect(() => toCalendarDate('tomorrow')).toThrow());
});
