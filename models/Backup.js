const mongoose = require('mongoose');

const permissionOverwriteSchema = new mongoose.Schema({
    id: { type: String },
    overwriteType: { type: Number }, // Renamed from 'type' to avoid Mongoose conflict
    allow: { type: String },
    deny: { type: String }
}, { _id: false });

const roleSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    color: { type: Number },
    hoist: { type: Boolean },
    position: { type: Number },
    permissions: { type: String },
    mentionable: { type: Boolean },
    managed: { type: Boolean }
}, { _id: false });

const categorySchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    position: { type: Number },
    permissionOverwrites: [permissionOverwriteSchema]
}, { _id: false });

const channelSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    channelType: { type: Number }, // Renamed from 'type' to avoid Mongoose conflict
    parentId: { type: String },
    position: { type: Number },
    topic: { type: String },
    nsfw: { type: Boolean },
    rateLimitPerUser: { type: Number },
    bitrate: { type: Number },
    userLimit: { type: Number },
    permissionOverwrites: [permissionOverwriteSchema]
}, { _id: false });

const backupSchema = new mongoose.Schema({
    backupId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    guildName: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isAutomatic: { type: Boolean, default: false },
    roles: [roleSchema],
    categories: [categorySchema],
    channels: [channelSchema]
});

backupSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);

