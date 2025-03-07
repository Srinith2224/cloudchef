const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const calendarSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledRecipes: [{
        recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
        date: { type: Date, required: true },
        mealTime: {
            type: String,
            enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
            default: 'Dinner'
        }
    }]
}, { timestamps: true });

calendarSchema.index({ userId: 1 });

module.exports = mongoose.model('Calendar', calendarSchema);