const mongoose = require('mongoose');

const antiWebhookSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    whitelistedWebhooks: [{
        type: String
    }],
    logChannelId: {
        type: String,
        default: null
    },
    action: {
        type: String,
        enum: ['delete', 'ban', 'kick'],
        default: 'delete'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AntiWebhook', antiWebhookSchema);

