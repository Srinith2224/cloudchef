const Cart = require('../models/CartModel');
const mongoose = require('mongoose');

// Example cart schema
const cartItemSchema = new mongoose.Schema({
    ingredient: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: '' } // Add unit field
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    items: [cartItemSchema]
});

// Add an item to the cart
const addItemToCart = async (req, res) => {
    const userId = req.userId;
    const { ingredient, quantity, unit } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            // If no cart exists, create a new one with the item
            const newCart = await Cart.create({
                userId,
                items: [{ ingredient, quantity: parseInt(quantity, 10), unit }]
            });
            return res.status(200).json(newCart.items[0]); // Return the newly added item
        }

        const existingItem = cart.items.find(item => item.ingredient.toLowerCase() === ingredient.toLowerCase());

        if (existingItem) {
            // Update the quantity of the existing item
            existingItem.quantity = parseInt(quantity, 10);
            existingItem.unit = unit; // Add unit update
        } else {
            // Add the new item to the cart
            cart.items.push({ 
                ingredient, 
                quantity: parseInt(quantity, 10),
                unit // Include unit
            });
        }

        await cart.save();
        res.status(200).json(existingItem || cart.items[cart.items.length - 1]); // Return the updated or newly added item
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add multiple items to the cart
const addMultipleItemsToCart = async (req, res) => {
    const userId = req.userId;
    const { ingredients } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            // If no cart exists, create a new one with the items
            const newCart = await Cart.create({
                userId,
                items: ingredients.map(ingredient => ({
                    ingredient: ingredient.name,
                    quantity: parseInt(ingredient.quantity, 10),
                    unit: ingredient.unit || '' // Include unit
                }))
            });
            return res.status(200).json(newCart);
        }

        // Update the quantities of existing items or add new items
        ingredients.forEach(ingredient => {
            const existingItem = cart.items.find(item => item.ingredient.toLowerCase() === ingredient.name.toLowerCase());

            if (existingItem) {
                existingItem.quantity = parseInt(existingItem.quantity, 10) + parseInt(ingredient.quantity, 10);
            } else {
                cart.items.push({ ingredient: ingredient.name, quantity: parseInt(ingredient.quantity, 10), unit: ingredient.unit || '' });
            }
        });

        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all cart items
const getCartItems = async (req, res) => {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'No cart found for this user' });
        }
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete an item from the cart
const deleteItemFromCart = async (req, res) => {
    const userId = req.userId;
    const { ingredientId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const cart = await Cart.findOneAndUpdate(
            { userId },
            { $pull: { items: { _id: ingredientId } } },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({ error: 'No cart found for this user' });
        }

        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update the quantity of an item in the cart
const updateItemQuantity = async (req, res) => {
    const userId = req.userId;
    const { ingredientId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ error: 'No cart found for this user' });
        }

        const item = cart.items.id(ingredientId);

        if (!item) {
            return res.status(404).json({ error: 'No such item in the cart' });
        }

        item.quantity = parseInt(quantity, 10);
        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addItemToCart,
    addMultipleItemsToCart,
    getCartItems,
    deleteItemFromCart,
    updateItemQuantity
};