const mongoose = require('mongoose');

const WelcomeConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    message: { type: String, default: 'Bienvenido {user} al servidor!' },
    enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('WelcomeConfig', WelcomeConfigSchema);

