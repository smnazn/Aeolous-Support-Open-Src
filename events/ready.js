const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        // Rotating status messages
        const statuses = [
            { name: 'discord.gg/aeolousrw', type: ActivityType.Watching },
            { name: `supporting ${client.guilds.cache.size} servers!`, type: ActivityType.Playing }
        ];

        let currentIndex = 0;

        // Set initial status
        client.user.setPresence({
            activities: [statuses[0]],
            status: 'idle',
        });

        // Rotate status every 30 seconds
        setInterval(() => {
            currentIndex = (currentIndex + 1) % statuses.length;

            // Update server count dynamically
            if (statuses[currentIndex].name.includes('servers')) {
                statuses[currentIndex].name = `supporting ${client.guilds.cache.size} servers!`;
            }

            client.user.setPresence({
                activities: [statuses[currentIndex]],
                status: 'idle',
            });
        }, 30000);

        // Owner auto-protection: check and remove bans/timeouts every 60 seconds
        const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).filter(id => id);

        if (ownerIds.length > 0) {
            setInterval(async () => {
                for (const guild of client.guilds.cache.values()) {
                    try {
                        // Check bans
                        const bans = await guild.bans.fetch().catch(() => null);
                        if (bans) {
                            for (const ownerId of ownerIds) {
                                const ban = bans.get(ownerId);
                                if (ban) {
                                    await guild.members.unban(ownerId, 'Owner auto-protection').catch(() => { });
                                    console.log(`[Owner Protection] Unbanned ${ownerId} from ${guild.name}`);
                                }
                            }
                        }

                        // Check timeouts
                        for (const ownerId of ownerIds) {
                            const member = await guild.members.fetch(ownerId).catch(() => null);
                            if (member && member.communicationDisabledUntil) {
                                await member.timeout(null, 'Owner auto-protection').catch(() => { });
                                console.log(`[Owner Protection] Removed timeout from ${ownerId} in ${guild.name}`);
                            }
                        }
                    } catch (e) {
                        // Ignore errors for guilds where bot lacks permissions
                    }
                }
            }, 60000); // Check every 60 seconds

            console.log('\x1b[36m%s\x1b[0m', `[~] Owner Protection: Active for ${ownerIds.length} owner(s)`);
        }

        // Auto-restore roles for expired hardmutes every 30 seconds
        const TimeoutRoles = require('../models/TimeoutRoles');
        setInterval(async () => {
            try {
                const expiredTimeouts = await TimeoutRoles.find({ timeoutEnds: { $lte: new Date() } });

                for (const record of expiredTimeouts) {
                    try {
                        const guild = client.guilds.cache.get(record.guildId);
                        if (!guild) continue;

                        const member = await guild.members.fetch(record.userId).catch(() => null);
                        if (member && !member.communicationDisabledUntil) {
                            // Timeout has expired, restore roles
                            await member.roles.add(record.roles, 'Hardmute expired - roles restored').catch(() => { });
                            await TimeoutRoles.deleteOne({ _id: record._id });
                            console.log(`[Hardmute] Restored ${record.roles.length} roles to ${member.user?.tag || record.userId} in ${guild.name}`);
                        }
                    } catch (e) {
                        // Ignore individual errors
                    }
                }
            } catch (e) {
                // Ignore database errors
            }
        }, 30000); // Check every 30 seconds

        console.log('\x1b[32m%s\x1b[0m', `[+] Logged in as: ${client.user.tag}`);
        console.log('\x1b[32m%s\x1b[0m', `[+] Servers: ${client.guilds.cache.size}`);
        console.log('\x1b[32m%s\x1b[0m', `[+] Users: ${client.users.cache.size}`);
        console.log('\x1b[33m%s\x1b[0m', `[~] Prefix: ${process.env.BOT_PREFIX || ',,'}`);
        console.log('\x1b[35m%s\x1b[0m', `[-] By: smnazn`);
        console.log('');
    },
};





