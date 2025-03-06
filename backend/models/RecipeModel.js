const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RecipeSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    mainImage: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    totalTime: {
        hours: {
            type: Number,
            default: 0
        },
        minutes: {
            type: Number,
            default: 0
        }
    },
    ingredients: [{
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: String,
            required: true
        },
        unit: {
            type: String
        }
    }],
    nutrition: {
        calories: {
            type: Number
        },
        fat: {
            type: Number
        },
        protein: {
            type: Number
        },
        carbs: {
            type: Number
        }
    },
    steps: [{
        stepNumber: {
            type: Number
        },
        text: {
            type: String,
            required: true
        },
        image: {
            type: String
        },
        video: {
            type: String
        },
        ingredient: {
            type: String
        },
        quantity: {
            type: String
        },
        alternate: {
            type: String
        },
        timer: {
            type: Number
        }
    }],
    createdBy: {
        _id: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: true
        },
        firstName: { 
            type: String, 
            required: true 
        },
        lastName: { 
            type: String, 
            required: true 
        }
    },
    tags: [{
        type: String
    }]
}, { timestamps: true });

RecipeSchema.index({ title: 'text' });
RecipeSchema.index({ tags: 1 });

module.exports = mongoose.model('Recipe', RecipeSchema);