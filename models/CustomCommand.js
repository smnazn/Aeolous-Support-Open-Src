const mongoose = require('mongoose');

const customCommandSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: 'Comando personalizado' },
    // Embed configuration
    embedTitle: { type: String, default: null },
    embedDescription: { type: String, required: true },
    embedColor: { type: Number, default: 0x2B2D31 },
    embedImage: { type: String, default: null },
    embedThumbnail: { type: String, default: null },
    embedFooter: { type: String, default: null },
    // Metadata
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for unique command names per guild
customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CustomCommand', customCommandSchema);
