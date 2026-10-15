const mongoose = require('mongoose');

/** Error with an HTTP status that the error handler turns into a JSON response. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true; // safe to show this message to the user
  }
}

/** Wraps an async route so thrown errors reach the Express error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

const assertId = (id, label = 'ID') => {
  if (!isValidId(String(id || ''))) throw new HttpError(400, `Invalid ${label}`);
};

/** Escapes user input before using it inside a RegExp (prevents ReDoS / injection). */
const escapeRegex = (text = '') => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parses "2", "1.5", "1/2", "1 1/2" into a number. Returns NaN when it can't. */
const parseQuantity = (value) => {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (!text) return NaN;
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const num = parseFloat(text.replace(',', '.'));
  return Number.isFinite(num) ? num : NaN;
};

module.exports = { HttpError, asyncHandler, isValidId, assertId, escapeRegex, parseQuantity };
