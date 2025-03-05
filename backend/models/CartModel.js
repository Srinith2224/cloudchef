const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new mongoose.Schema({
  ingredient: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: '' } // Make sure this exists
});

const cartSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema]
}, { timestamps: true });

cartSchema.index({ userId: 1 });

module.exports = mongoose.model('Cart', cartSchema);