const mongoose = require('mongoose');

const ticketConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    panelChannelId: { type: String, default: null },
    panelMessageId: { type: String, default: null },
    supportRoleId: { type: String, default: null },
    ticketCategory: { type: String, default: null },
    logsChannel: { type: String, default: null },
    ticketLimit: { type: Number, default: 1 }, // Default 1 ticket per user
    blacklist: [{ type: String }], // Array of user IDs
    ticketCounter: { type: Number, default: 0 }
});

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);

