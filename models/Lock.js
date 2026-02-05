const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    backups: { type: Array, default: [] }, // [{ id, state }]
    unlockRoleId: { type: String, default: null }
});

module.exports = mongoose.model('Lock', lockSchema);

