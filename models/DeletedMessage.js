const mongoose = require('mongoose');

const deletedMessageSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    channelId: {
        type: String,
        required: true
    },
    authorId: {
        type: String,
        required: true
    },
    authorTag: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    attachments: [{
        url: String,
        name: String
    }],
    deletedAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours
    }
});

// Index for quick lookups
deletedMessageSchema.index({ guildId: 1, channelId: 1, deletedAt: -1 });

module.exports = mongoose.model('DeletedMessage', deletedMessageSchema);

