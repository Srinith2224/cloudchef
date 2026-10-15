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
    }],
    servings: {
        type: Number,
        min: 1,
        max: 50,
        default: 2
    },
    // Cached rating summary (source of truth is the Rating collection)
    ratingAvg: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    // Legacy embedded ratings kept for old documents; new ratings live in the Rating collection
    ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            default: ""
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

RecipeSchema.index({ title: 'text' });
RecipeSchema.index({ tags: 1 });
RecipeSchema.index({ 'createdBy._id': 1, createdAt: -1 });

module.exports = mongoose.model('Recipe', RecipeSchema);