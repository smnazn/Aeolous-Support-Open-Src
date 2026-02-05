const mongoose = require('mongoose');

const reactionRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    emoji: { type: String, required: true }, // Unicode emoji or custom ID
    roleId: { type: String, required: true }
});

// Compound index to ensure unique reaction per message
reactionRoleSchema.index({ messageId: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.model('ReactionRole', reactionRoleSchema);

