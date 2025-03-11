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
        required: true
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
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
