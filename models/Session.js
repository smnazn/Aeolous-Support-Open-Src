const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },

    // User data from Discord
    discordId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    avatar: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },

    // Cached guilds (updated on each login)
    guilds: [{
        id: String,
        name: String,
        icon: String,
        permissions: String
    }],

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true }
});

// Auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
