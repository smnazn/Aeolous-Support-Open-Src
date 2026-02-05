const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    ticketId: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closed', 'claimed'], default: 'open' },
    claimedBy: { type: String, default: null },
    claimedHistory: [{ type: String }], // Track all users who have claimed this ticket (for stats)
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null },
    type: { type: String, default: 'support' },
    finishUsed: { type: Boolean, default: false }
});

// Indexes for faster queries (channelId unique: true already has index)
ticketSchema.index({ guildId: 1, status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);

