const mongoose = require('mongoose');

const timeoutRolesSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    roles: [{ type: String }], // Array of role IDs that were removed
    timeoutEnds: { type: Date }, // When the timeout expires
    createdAt: { type: Date, default: Date.now }
});

// Compound index for fast lookups
timeoutRolesSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TimeoutRoles', timeoutRolesSchema);
