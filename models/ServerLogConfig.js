const mongoose = require('mongoose');

const serverLogConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    logChannelId: { type: String, default: null },
    // Log types enabled/disabled
    logRoleChanges: { type: Boolean, default: true },
    logNickChanges: { type: Boolean, default: true },
    logMessageDelete: { type: Boolean, default: true },
    logMessageEdit: { type: Boolean, default: true },
    logChannelChanges: { type: Boolean, default: true },
    logBans: { type: Boolean, default: true },
    logTimeouts: { type: Boolean, default: true },
    // Ignored channels (won't log messages from these)
    ignoredChannels: [{ type: String }]
});

module.exports = mongoose.model('ServerLogConfig', serverLogConfigSchema);
