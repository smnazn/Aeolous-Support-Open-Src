const mongoose = require('mongoose');

const snipeOptOutSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    optedOut: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SnipeOptOut', snipeOptOutSchema);
