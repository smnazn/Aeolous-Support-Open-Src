const mongoose = require('mongoose');

const ApiAntiLinkSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    blockImages: { type: Boolean, default: false }, // Blocks common image extensions in URLs
    blockInvites: { type: Boolean, default: true }, // Blocks Discord invites
    blockLinks: { type: Boolean, default: true },   // Blocks all HTTP/HTTPS links
    whitelistedroles: { type: [String], default: [] },
    whitelistedchannels: { type: [String], default: [] },
    logChannelId: { type: String, default: null }
});

module.exports = mongoose.model('AntiLink', ApiAntiLinkSchema);

