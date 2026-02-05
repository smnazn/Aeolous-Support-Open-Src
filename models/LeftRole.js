const mongoose = require('mongoose');

const leftRoleSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    roles: [{
        type: String
    }],
    leftAt: {
        type: Date,
        default: Date.now
    }
});

leftRoleSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('LeftRole', leftRoleSchema);

