const mongoose = require('mongoose');

const pingSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    pings: [{
        authorId: String,
        authorTag: String,
        channelId: String,
        messageId: String,
        messageUrl: String,
        content: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    lastCleared: {
        type: Date,
        default: Date.now
    }
});

// Compound index for user pings
pingSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('Ping', pingSchema);

