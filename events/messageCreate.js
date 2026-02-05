const { Events, EmbedBuilder } = require('discord.js');
require('dotenv').config({ quiet: true });
const Ping = require('../models/Ping');
const AntiWebhook = require('../models/AntiWebhook');
const AntiLink = require('../models/AntiLink');
const CustomCommand = require('../models/CustomCommand');
const cache = require('../utils/cache');
const { ICONS } = require('../utils/helpers');
const { getGuildConfig, getPrefix } = require('../utils/guildConfig');
const guessGameHandler = require('./guessGameHandler');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        // Guess Game Handler - process guesses before anything else
        await guessGameHandler.handleMessage(message);

        // --- Message Counting ---
        try {
            const UserStats = require('../models/UserStats');
            const now = new Date();

            // Find the user stats first to check logic
            let stats = await UserStats.findOne({ guildId: message.guild.id, userId: message.author.id });

            if (!stats) {
                stats = new UserStats({ guildId: message.guild.id, userId: message.author.id });
            }

            // Check if 24h passed since last reset
            const msSinceReset = now - stats.lastDailyReset;
            const oneDay = 1000 * 60 * 60 * 24;

            if (msSinceReset >= oneDay) {
                stats.dailyMessageCount = 0;
                stats.lastDailyReset = now;
            }

            stats.messageCount += 1;
            stats.dailyMessageCount += 1;
            stats.lastMessageTimestamp = now;

            await stats.save();
        } catch (error) {
            console.error('Error updating message count:', error);
        }

        // --- Partners Channel Check ---
        try {
            const config = await getGuildConfig(message.guild.id);
            if (config.partnersChannelId && config.partnersRoleId) {
                if (message.channel.id === config.partnersChannelId) {
                    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
                    if (inviteRegex.test(message.content)) {
                        await message.channel.send(`<@&${config.partnersRoleId}>`);
                    }
                }
            }
        } catch (error) {
            console.error('Error in partners check:', error);
        }

        // Anti-Link Check
        try {
            const cacheKey = `antilink_${message.guild.id}`;
            let antiLinkSettings = cache.get(cacheKey);

            if (!antiLinkSettings) {
                antiLinkSettings = await AntiLink.findOne({ guildId: message.guild.id });
                cache.set(cacheKey, antiLinkSettings || { enabled: false });
            }

            if (antiLinkSettings && antiLinkSettings.enabled) {
                // Check Whitelists
                const isWhitelistedRole = message.member.roles.cache.some(role => antiLinkSettings.whitelistedroles.includes(role.id));
                const isWhitelistedChannel = antiLinkSettings.whitelistedchannels.includes(message.channel.id);
                const isAdmin = message.member.permissions.has('Administrator');

                if (!isWhitelistedRole && !isWhitelistedChannel && !isAdmin) {
                    const content = message.content.toLowerCase();
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const logChannel = antiLinkSettings.logChannelId ? message.guild.channels.cache.get(antiLinkSettings.logChannelId) : null;

                    let deleted = false;
                    let reason = '';

                    // Check for Invites
                    if (antiLinkSettings.blockInvites && (content.includes('discord.gg/') || content.includes('discord.com/invite/'))) {
                        deleted = true;
                        reason = 'Discord Invite (Muted 1m)';
                        // Timeout the user for 1 minute
                        if (message.member.moderatable) {
                            await message.member.timeout(60 * 1000, 'Anti-Link: Discord Invite');
                        }
                    }
                    // Check for Image Links
                    else if (antiLinkSettings.blockImages) {
                        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
                        const imageDomains = ['imgur.com', 'gyazo.com', 'prnt.sc', 'postimg.cc', 'ibb.co'];

                        // Check for extensions in URLs
                        const hasImageExtension = urlRegex.test(content) && imageExtensions.some(ext => content.includes(ext));
                        // Check for image domains
                        const hasImageDomain = imageDomains.some(domain => content.includes(domain));

                        if (hasImageExtension || hasImageDomain) {
                            deleted = true;
                            reason = 'Image Link';
                        }
                    }
                    // Check for General Links
                    else if (antiLinkSettings.blockLinks && urlRegex.test(content) && !deleted) {
                        deleted = true;
                        reason = 'Unauthorized Link';
                    }

                    if (deleted) {
                        await message.delete().catch(() => { });
                        const warningMsg = await message.channel.send(`${message.author}, ${ICONS.POINT} Links are not allowed here!`);
                        setTimeout(() => warningMsg.delete().catch(() => { }), 5000);

                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle(`${ICONS.LOADING} Auto-Mod: Link Blocked`)
                                .setDescription(`> **User:** ${message.author} (${message.author.id})\n> **Channel:** ${message.channel}\n> **Reason:** ${reason}\n> **Content:** \`${message.content}\``)
                                .setColor(0xED4245)
                                .setTimestamp();
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                        return; // Stop processing
                    }
                }
            }
        } catch (error) {
            console.error('Error checking anti-link:', error);
        }

        // Anti-Webhook Check
        if (message.webhookId) {
            try {
                const cacheKey = `antiwebhook_${message.guild.id}`;
                let settings = cache.get(cacheKey);

                if (!settings) {
                    settings = await AntiWebhook.findOne({ guildId: message.guild.id });
                    // Cache even if null to avoid hitting DB for non-existent settings repeatedly
                    // (caching null for a shorter time might be better, but standard TTL is fine here)
                    cache.set(cacheKey, settings || { enabled: false });
                }

                // If we cached a default object for null, referencing 'enabled' is safe.
                if (settings && settings.enabled) {
                    // Check if webhook is whitelisted
                    if (settings.whitelistedWebhooks && !settings.whitelistedWebhooks.includes(message.webhookId)) {
                        await message.delete();

                        if (settings.logChannelId) {
                            const logChannel = message.guild.channels.cache.get(settings.logChannelId);
                            if (logChannel) {
                                await logChannel.send(`<a:loading:1444026341912612874> Blocked webhook message in ${message.channel}`);
                            }
                        }
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking webhook:', error);
            }
        }

        // Ping Tracking - Only track actual mentions, not replies
        if (message.mentions.users.size > 0) {
            try {
                for (const [userId, user] of message.mentions.users) {
                    if (user.bot) continue;
                    if (userId === message.author.id) continue; // Don't track self-mentions

                    // Skip if this mention is only from a reply (not an actual mention in the message)
                    if (message.reference) {
                        try {
                            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                            // If the only mention is the person being replied to, skip it
                            if (repliedMessage.author.id === userId && message.mentions.users.size === 1) {
                                continue;
                            }
                        } catch (error) {
                            // Message might be deleted, continue anyway
                        }
                    }

                    let pingDoc = await Ping.findOne({ guildId: message.guild.id, userId: userId });
                    if (!pingDoc) {
                        pingDoc = new Ping({ guildId: message.guild.id, userId: userId, pings: [] });
                    }

                    pingDoc.pings.push({
                        authorId: message.author.id,
                        authorTag: message.author.tag,
                        channelId: message.channel.id,
                        messageId: message.id,
                        messageUrl: message.url,
                        content: message.content.substring(0, 200),
                        timestamp: new Date()
                    });

                    // Keep only last 50 pings
                    if (pingDoc.pings.length > 50) {
                        pingDoc.pings = pingDoc.pings.slice(-50);
                    }

                    await pingDoc.save();
                }
            } catch (error) {
                console.error('Error tracking pings:', error);
            }
        }

        // AFK Check
        if (message.client.afk && message.client.afk.has(message.author.id)) {
            const afkData = message.client.afk.get(message.author.id);

            // Check if we should ignore this message (within cooldown period)
            if (afkData.ignoreUntil && Date.now() < afkData.ignoreUntil) {
                // Still in cooldown, ignore this message
            } else {
                const afkDuration = Date.now() - afkData.time;
                const seconds = Math.floor(afkDuration / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);

                let durationStr = '';
                if (hours > 0) {
                    durationStr = `${hours} hora${hours > 1 ? 's' : ''}`;
                } else if (minutes > 0) {
                    durationStr = `${minutes} minuto${minutes > 1 ? 's' : ''}`;
                } else {
                    durationStr = `${seconds} segundo${seconds > 1 ? 's' : ''}`;
                }

                message.client.afk.delete(message.author.id);

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(`${ICONS.CHECKMARK || '<:checkmark:1448832045068583033>'} **Bienvenido de vuelta,** ${message.author}!\n\n${ICONS.POINT || '<a:15136blackdot:1448143887699804252>'} Estuviste AFK por **${durationStr}**.`)
                    .setColor(0x2B2D31);
                await message.reply({ embeds: [welcomeEmbed] });
            }
        }

        if (message.mentions.users.size > 0 && message.client.afk) {
            message.mentions.users.forEach(user => {
                if (message.client.afk.has(user.id)) {
                    const data = message.client.afk.get(user.id);
                    const afkEmbed = new EmbedBuilder()
                        .setDescription(`${ICONS.WARNING || '<:warning:1448832070628671488>'} **${user.tag}** está AFK: ${data.reason}\n${ICONS.POINT || '<a:15136blackdot:1448143887699804252>'} Desde: <t:${Math.floor(data.time / 1000)}:R>`)
                        .setColor(0x2B2D31);
                    message.reply({ embeds: [afkEmbed] });
                }
            });
        }

        // Prefix Handling - uses cached guildConfig
        const prefix = await getPrefix(message.guild.id);
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        let commandName = args.shift().toLowerCase();

        // Command aliases
        const aliases = {
            'ui': 'userinfo',
            'mc': 'membercount',
            'rm': 'reminder',
            'i': 'invites',
            'm': 'messages',
            'ts': 'translate'
        };

        if (aliases[commandName]) {
            commandName = aliases[commandName];
        }

        const command = message.client.commands.get(commandName);

        if (!command) {
            // Check for custom commands
            try {
                const customCmd = await CustomCommand.findOne({ guildId: message.guild.id, name: commandName });
                if (customCmd) {
                    const embed = new EmbedBuilder()
                        .setDescription(customCmd.embedDescription)
                        .setColor(customCmd.embedColor || 0x2B2D31);

                    if (customCmd.embedTitle) embed.setTitle(customCmd.embedTitle);
                    if (customCmd.embedImage) embed.setImage(customCmd.embedImage);
                    if (customCmd.embedThumbnail) embed.setThumbnail(customCmd.embedThumbnail);
                    if (customCmd.embedFooter) embed.setFooter({ text: customCmd.embedFooter });

                    await message.channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('[CustomCommand] Error:', error);
            }
            return;
        }

        try {
            if (command.messageRun) {
                await command.messageRun(message, args);
            } else {
                await message.reply('This command is only available as a slash command for now.');
            }
        } catch (error) {
            console.error(error);
            await message.reply('There was an error executing that command.');
        }
    },
};





