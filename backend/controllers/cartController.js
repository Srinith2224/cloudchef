const Cart = require('../models/CartModel');
const { HttpError, asyncHandler, assertId, parseQuantity } = require('../utils/http');

const UNITS = ['', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'packet', 'piece', 'slice'];

const cleanItem = (raw) => {
  const ingredient = String(raw?.ingredient ?? raw?.name ?? '').trim().slice(0, 80);
  if (!ingredient) throw new HttpError(400, 'Add an item name.');
  let quantity = parseQuantity(raw?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;
  quantity = Math.min(Math.round(quantity * 100) / 100, 100000);
  const unit = UNITS.includes(raw?.unit) ? raw.unit : '';
  return { ingredient, quantity, unit };
};

const sameItem = (a, b) => a.ingredient.toLowerCase() === b.ingredient.toLowerCase() && (a.unit || '') === (b.unit || '');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
};

// GET /api/cart
const getCartItems = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.userId });
  res.status(200).json({ items: cart ? cart.items : [] });
});

// POST /api/cart/add  { ingredient, quantity, unit }
// Adds the item, or adds the quantity to an existing line with the same name and unit.
const addItemToCart = asyncHandler(async (req, res) => {
  const item = cleanItem(req.body);
  const cart = await getOrCreateCart(req.userId);
  const existing = cart.items.find((i) => sameItem(i, item));
  if (existing) {
    existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
    existing.checked = false;
  } else {
    cart.items.push(item);
  }
  await cart.save();
  res.status(200).json({ items: cart.items });
});

// POST /api/cart/add-multiple  { ingredients: [{ name, quantity, unit }] }
const addMultipleItemsToCart = asyncHandler(async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || !ingredients.length) throw new HttpError(400, 'Send at least one ingredient.');

  const cart = await getOrCreateCart(req.userId);
  for (const raw of ingredients.slice(0, 100)) {
    let item;
    try {
      item = cleanItem(raw);
    } catch {
      continue; // skip blank lines
    }
    const existing = cart.items.find((i) => sameItem(i, item));
    if (existing) {
      existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
      existing.checked = false;
    } else {
      cart.items.push(item);
    }
  }
  await cart.save();
  res.status(200).json({ items: cart.items });
});

// DELETE /api/cart/delete  { ingredientId }
const deleteItemFromCart = asyncHandler(async (req, res) => {
  const { ingredientId } = req.body;
  assertId(ingredientId, 'item ID');
  const cart = await Cart.findOneAndUpdate(
    { userId: req.userId },
    { $pull: { items: { _id: ingredientId } } },
    { new: true }
  );
  res.status(200).json({ items: cart ? cart.items : [] });
});

// POST /api/cart/update  { ingredientId, quantity?, checked? }
const updateItemQuantity = asyncHandler(async (req, res) => {
  const { ingredientId } = req.body;
  assertId(ingredientId, 'item ID');

  const cart = await Cart.findOne({ userId: req.userId });
  const item = cart && cart.items.id(ingredientId);
  if (!item) throw new HttpError(404, 'This item is no longer in your list.');

  if (req.body.quantity !== undefined) {
    const quantity = parseQuantity(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new HttpError(400, 'Quantity must be more than 0.');
    item.quantity = Math.round(quantity * 100) / 100;
  }
  if (typeof req.body.checked === 'boolean') item.checked = req.body.checked;

  await cart.save();
  res.status(200).json({ items: cart.items });
});

// DELETE /api/cart/clear  { onlyChecked?: boolean }
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.userId });
  if (!cart) return res.status(200).json({ items: [] });
  cart.items = req.body?.onlyChecked ? cart.items.filter((i) => !i.checked) : [];
  await cart.save();
  res.status(200).json({ items: cart.items });
});

module.exports = {
  addItemToCart,
  addMultipleItemsToCart,
  getCartItems,
  deleteItemFromCart,
  updateItemQuantity,
  clearCart
};
