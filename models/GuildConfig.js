const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '.' },
    staffRoleId: { type: String, default: null },
    partnersRoleId: { type: String, default: null },
    partnersChannelId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    welcomeChannelId: { type: String, default: null },
    welcomeMessage: { type: String, default: 'Bienvenido {user} al servidor!' },
    ticketCategoryId: { type: String, default: null },
    autoBackup: { type: Boolean, default: false }
});

// unique: true already creates an index, so no need for additional index

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
