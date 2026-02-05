const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    regular: { type: Number, default: 0 }, // Real invites
    fake: { type: Number, default: 0 }, // Fake/suspicious invites
    rejoins: { type: Number, default: 0 }, // Users who returned
    leaves: { type: Number, default: 0 }, // Users who left
    bonus: { type: Number, default: 0 }, // Bonus invites added by admins
    total: { type: Number, default: 0 }, // (regular + rejoins + bonus) - leaves
    inviterId: { type: String, default: null } // Who invited this user (if applicable)
});

// Compound index for quick lookups
inviteSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Invite', inviteSchema);

