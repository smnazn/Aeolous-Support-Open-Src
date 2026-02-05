const mongoose = require('mongoose');

const inviteConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    welcomeChannelId: { type: String, default: null },
    leaveChannelId: { type: String, default: null },
    autoRole: { type: String, default: null }, // Role to give on join
    blacklistedUsers: [{ type: String }], // Users ignored by tracker
    blacklistedChannels: [{ type: String }] // Channels ignored
});

module.exports = mongoose.model('InviteConfig', inviteConfigSchema);

