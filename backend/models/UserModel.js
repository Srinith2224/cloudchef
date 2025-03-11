const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function() {
            // Password is required only if the user doesn't have googleId
            return !this.googleId;
        }
    },
    googleId: {
        type: String
    },
    profilePhoto: {
        type: String
    },
    about: {
        type: String
    },
    region: {
        type: String
    },
    savedRecipes: [{
        type: Schema.Types.ObjectId,
        ref: 'Recipe'
    }],
    role: {
        type: String,
        enum: ['admin', 'user', 'guest'],
        default: 'user'
    },
    // New social fields
    followers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    bio: {
        type: String,
        default: ''
    },
    featuredRecipe: {
        type: Schema.Types.ObjectId,
        ref: 'Recipe'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
