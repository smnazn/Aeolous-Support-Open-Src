const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, required: true },
    moderatorId: { type: String, required: true },
    timestamp: { type: Number, default: Date.now }
});

module.exports = mongoose.model('Warning', warningSchema);
