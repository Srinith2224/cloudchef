const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedItem: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['recipe', 'review', 'user'], default: 'recipe' },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' }
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
