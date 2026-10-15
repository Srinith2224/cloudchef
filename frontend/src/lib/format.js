export const formatTime = (totalTime) => {
  if (!totalTime) return '';
  const h = Number(totalTime.hours) || 0;
  const m = Number(totalTime.minutes) || 0;
  if (!h && !m) return '';
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const totalMinutes = (totalTime) => (Number(totalTime?.hours) || 0) * 60 + (Number(totalTime?.minutes) || 0);

/** Scales "2", "1/2", "1 1/2", "200" by a factor and returns a tidy string. */
export const scaleQuantity = (quantity, factor) => {
  if (factor === 1) return quantity;
  const text = String(quantity || '').trim();
  let n = NaN;
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const frac = text.match(/^(\d+)\/(\d+)$/);
  if (mixed) n = +mixed[1] + +mixed[2] / +mixed[3];
  else if (frac) n = +frac[1] / +frac[2];
  else if (/^\d+([.,]\d+)?$/.test(text)) n = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(n)) return quantity;
  return prettyNumber(n * factor);
};

export const prettyNumber = (n) => {
  if (!Number.isFinite(n)) return '';
  const whole = Math.floor(n);
  const rest = n - whole;
  const fractions = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']];
  if (n < 20) {
    const match = fractions.find(([v]) => Math.abs(rest - v) < 0.04);
    if (match) return `${whole || ''}${match[1]}`;
  }
  if (rest < 0.04) return String(whole);
  return n < 10 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n));
};

export const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'litre' },
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'cup', label: 'cup' },
  { value: 'piece', label: 'piece' },
  { value: 'slice', label: 'slice' },
  { value: 'packet', label: 'packet' }
];

export const unitLabel = (unit, quantity) => {
  const found = UNITS.find((u) => u.value === unit);
  if (!found) return '';
  const n = parseFloat(quantity);
  const plural = (n > 1 || (n >= 1 && /[¼⅓½⅔¾]/.test(String(quantity)))) && ['piece', 'slice', 'packet', 'cup', 'litre'].includes(found.label);
  return plural ? `${found.label}s` : found.label;
};

export const TAG_GROUPS = {
  Cuisine: ['Indian', 'Chinese', 'Italian', 'Mexican', 'American', 'Thai', 'Japanese', 'Mediterranean', 'French'],
  Meal: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer'],
  Diet: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'High-Protein'],
  Difficulty: ['Easy', 'Medium', 'Hard']
};

/** Local date as YYYY-MM-DD (never toISOString, which shifts the day in IST). */
export const toDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fromDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
