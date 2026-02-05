const mongoose = require('mongoose');

const UserStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
    dailyMessageCount: { type: Number, default: 0 },
    lastMessageTimestamp: { type: Date, default: Date.now },
    lastDailyReset: { type: Date, default: Date.now }
});

UserStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });
UserStatsSchema.index({ guildId: 1, messageCount: -1 }); // For leaderboard

module.exports = mongoose.model('UserStats', UserStatsSchema);

