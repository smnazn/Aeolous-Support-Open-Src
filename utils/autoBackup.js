const Backup = require('../models/Backup');
const { ChannelType } = require('discord.js');
const crypto = require('crypto');

// Auto-backup interval in milliseconds (default: 6 hours)
const AUTO_BACKUP_INTERVAL = 6 * 60 * 60 * 1000;

// Store interval references per guild
const intervals = new Map();

function generateBackupId() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function createAutoBackup(guild) {
    try {

        // Collect roles
        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id && !r.managed)
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
                hoist: r.hoist,
                position: r.position,
                permissions: r.permissions.bitfield.toString(),
                mentionable: r.mentionable,
                managed: r.managed
            }));

        // Collect categories
        const categories = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position)
            .map(c => ({
                id: c.id,
                name: c.name,
                position: c.position,
                permissionOverwrites: c.permissionOverwrites?.cache?.map(p => ({
                    id: p.id,
                    overwriteType: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString()
                })) || []
            }));

        // Collect channels (exclude threads and other non-standard types)
        const validChannelTypes = [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum];
        const channels = guild.channels.cache
            .filter(c => c.type !== ChannelType.GuildCategory && validChannelTypes.includes(c.type))
            .sort((a, b) => a.position - b.position)
            .map(c => ({
                id: c.id,
                name: c.name,
                channelType: c.type,
                parentId: c.parentId,
                position: c.position,
                topic: c.topic || null,
                nsfw: c.nsfw || false,
                rateLimitPerUser: c.rateLimitPerUser || 0,
                bitrate: c.bitrate || null,
                userLimit: c.userLimit || null,
                permissionOverwrites: c.permissionOverwrites?.cache?.map(p => ({
                    id: p.id,
                    overwriteType: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString()
                })) || []
            }));

        // Create backup
        const backupId = generateBackupId();
        const backup = new Backup({
            backupId,
            guildId: guild.id,
            guildName: guild.name,
            createdBy: 'AUTO',
            isAutomatic: true,
            roles,
            categories,
            channels
        });

        await backup.save();

        // Clean old automatic backups (keep last 5)
        const autoBackups = await Backup.find({ guildId: guild.id, isAutomatic: true }).sort({ createdAt: -1 });
        if (autoBackups.length > 5) {
            const toDelete = autoBackups.slice(5);
            await Backup.deleteMany({ _id: { $in: toDelete.map(b => b._id) } });
        }



    } catch (error) {
        console.error(`[AutoBackup] Error creating backup for ${guild.id}:`, error);
    }
}

function startAutoBackup(client) {

    // Create initial backups for all guilds after a short delay
    setTimeout(() => {
        client.guilds.cache.forEach(guild => {
            // Start interval for each guild
            const interval = setInterval(() => {
                createAutoBackup(guild);
            }, AUTO_BACKUP_INTERVAL);

            intervals.set(guild.id, interval);

            // Create first backup immediately
            createAutoBackup(guild);
        });
    }, 30000); // Wait 30 seconds after bot starts

    // Handle new guilds
    client.on('guildCreate', (guild) => {
        const interval = setInterval(() => {
            createAutoBackup(guild);
        }, AUTO_BACKUP_INTERVAL);
        intervals.set(guild.id, interval);
        createAutoBackup(guild);
    });

    // Clean up when leaving a guild
    client.on('guildDelete', (guild) => {
        const interval = intervals.get(guild.id);
        if (interval) {
            clearInterval(interval);
            intervals.delete(guild.id);
        }
    });
}

function stopAutoBackup(guildId) {
    const interval = intervals.get(guildId);
    if (interval) {
        clearInterval(interval);
        intervals.delete(guildId);
    }
}

module.exports = {
    startAutoBackup,
    stopAutoBackup,
    createAutoBackup,
    AUTO_BACKUP_INTERVAL
};



