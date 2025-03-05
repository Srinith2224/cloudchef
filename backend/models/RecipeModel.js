const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
    title: { type: String, required: true },
    mainImage: { type: String },
    description: { type: String },
    totalTime: {
        hours: { type: Number },
        minutes: { type: Number }
    },
    ingredients: [{
        image: { type: String },
        name: { type: String },
        quantity: { type: String },
        unit: { type: String, default: '' },
        alternate: [{ type: String }]
    }],
    nutrition: {
        calories: { type: Number },
        fat: { type: Number },
        protein: { type: Number },
        carbs: { type: Number }
    },
    steps: [{
        stepNumber: { type: Number },
        image: { type: String },
        text: { type: String },
        ingredients: [{ type: String }],
        timer: { type: Number }
    }],
    createdBy: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true }
    },
    ratings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number },
        comment: { type: String },
        commentImage: { type: String }
    }],
    averageRating: { type: Number },
    createdAt: { type: Date, default: Date.now },
    tags: [{ type: String }],
    sharedCount: { type: Number }
}, { timestamps: true });

recipeSchema.index({ title: 'text' });
recipeSchema.index({ tags: 1 });

module.exports = mongoose.model('Recipe', recipeSchema);
