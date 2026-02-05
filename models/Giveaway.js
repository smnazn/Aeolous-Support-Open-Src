const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    channelId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    prize: {
        type: String,
        required: true
    },
    hostId: {
        type: String,
        required: true
    },
    endTime: {
        type: Date,
        required: true,
        index: true
    },
    participants: [{
        type: String
    }],
    winnerId: {
        type: String,
        default: null
    },
    winnerCount: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['active', 'ended', 'claimed'],
        default: 'active',
        index: true
    },
    winnerMessage: {
        type: String,
        default: 'Congratulations {winner}! You won **{prize}**!'
    },
    claimTime: {
        type: Number,
        default: 24 // hours
    },
    claimTimeRoles: [{
        roleId: String,
        seconds: Number
    }],
    defaultClaimTime: {
        type: Number,
        default: 10
    },
    claimDeadline: Date,
    claimStartTime: Date,
    winners: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for finding active giveaways
giveawaySchema.index({ status: 1, endTime: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);

