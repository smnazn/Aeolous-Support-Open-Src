const mongoose = require('mongoose');

const guessGameSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },
    pingRoleId: { type: String, default: null },
    active: { type: Boolean, default: false },
    targetNumber: { type: Number, default: null },
    maxNumber: { type: Number, default: 1000 },
    prize: { type: String, default: null },
    startedBy: { type: String, default: null },
    startedAt: { type: Date, default: null },
    guesses: [{
        userId: String,
        guess: Number,
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('GuessGame', guessGameSchema);
