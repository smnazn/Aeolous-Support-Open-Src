const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

// Parse duration string like "1w", "2d", "3h", "30m" into minutes
function parseDuration(input) {
    if (!isNaN(input)) return parseInt(input); // Already in minutes

    const match = input.match(/^(\d+)(m|h|d|w)$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'm': return value;
        case 'h': return value * 60;
        case 'd': return value * 60 * 24;
        case 'w': return value * 60 * 24 * 7;
        default: return null;
    }
}

// Format minutes into readable string
function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
    return `${Math.floor(minutes / 10080)}w`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user.')
        .addUserOption(option => option.setName('target').setDescription('The user to timeout').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 30m, 1h, 1d, 1w)').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const durationStr = interaction.options.getString('duration') || '1h';
        const duration = parseDuration(durationStr) || 60;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        await this.handleTimeout(interaction, target, duration, reason);
    },
    async messageRun(message, args) {
        const isOwner = message.author.id === process.env.OWNER_ID || (process.env.OWNER_ID || '').split(',').includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** You do not have permission.`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Timeout Command`)
                .setDescription(`> **Usage:** \`.timeout <user/ID> [duration] [reason]\`\n\n${DISCO_ICONS.POINT} Duration formats: \`30m\`, \`1h\`, \`1d\`, \`1w\``)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        // Support both mention and ID
        let target = message.mentions.users.first();
        if (!target && args[0]) {
            const userId = args[0].replace(/[<@!>]/g, '');
            if (/^\d{17,19}$/.test(userId)) {
                target = await message.client.users.fetch(userId).catch(() => null);
            }
        }
        if (!target) return message.reply('Please mention a user or provide a valid user ID.');

        // Remove the target mention/ID from args to find duration and reason cleanly
        const meaningfulArgs = args.filter(arg => !arg.includes(target.id) && arg !== args[0]);

        let duration = 60; // Default 1 hour
        let reasonParts = meaningfulArgs;

        // Check if first meaningful arg is a duration
        if (meaningfulArgs.length > 0) {
            const potentialDuration = meaningfulArgs[0];
            const parsed = parseDuration(potentialDuration);
            if (parsed !== null) {
                duration = parsed;
                reasonParts = meaningfulArgs.slice(1);
            }
        }

        const reason = reasonParts.join(' ') || 'No reason provided';
        await this.handleTimeout(message, target, duration, reason);
    },
    async handleTimeout(source, target, duration, reason) {
        const member = await source.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** User not found in this server.`)
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const executor = source.user || source.author;

        // Owner protection - owners can't be timed out and can't timeout each other
        const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim());
        const targetIsOwner = ownerIds.includes(target.id);
        const executorIsOwner = ownerIds.includes(executor.id);

        if (targetIsOwner) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} You cannot timeout a bot owner.`)
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }

        if (!executorIsOwner) {
            if (target.id === executor.id) {
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CROSSMARK} You cannot timeout yourself.`)
                    .setColor(0x2B2D31);
                const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
                return reply({ embeds: [embed], ephemeral: true });
            }

            const targetHighestRole = member.roles.highest.position;
            const executorHighestRole = source.member.roles.highest.position;

            if (targetHighestRole >= executorHighestRole) {
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CROSSMARK} You cannot timeout a member with a higher or equal role.`)
                    .setColor(0x2B2D31);
                const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
                return reply({ embeds: [embed], ephemeral: true });
            }
        }

        if (member.id === source.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** Cannot timeout the server owner.`)
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const botMember = await source.guild.members.fetch(source.client.user.id).catch(() => null);

        // Check if we need to strip roles (user has admin or role higher than bot)
        const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        const roleHigherThanBot = botMember && member.roles.highest.position >= botMember.roles.highest.position;

        let strippedRoles = [];

        if (hasAdmin || roleHigherThanBot) {
            // Get all roles that give admin or are higher than bot's role
            const rolesToRemove = member.roles.cache.filter(role => {
                if (role.id === source.guild.id) return false; // Skip @everyone
                const isAdmin = role.permissions.has(PermissionFlagsBits.Administrator);
                const isHigher = botMember && role.position >= botMember.roles.highest.position;
                return isAdmin || isHigher;
            });

            if (rolesToRemove.size > 0) {
                try {
                    strippedRoles = rolesToRemove.map(r => r.id);
                    await member.roles.remove(rolesToRemove, `Timeout by ${(source.user || source.author).tag} - roles stripped`);
                } catch (e) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** No puedo quitar los roles de este usuario.`)
                        .setColor(0x2B2D31);
                    const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
                    return reply({ embeds: [embed], ephemeral: true });
                }
            }
        }

        try {
            const TimeoutRoles = require('../../models/TimeoutRoles');
            const timeoutMs = duration * 60 * 1000;
            await member.timeout(timeoutMs, reason);

            // Save stripped roles if any
            if (strippedRoles.length > 0) {
                await TimeoutRoles.findOneAndUpdate(
                    { guildId: source.guild.id, userId: member.id },
                    {
                        roles: strippedRoles,
                        timeoutEnds: new Date(Date.now() + timeoutMs)
                    },
                    { upsert: true }
                );
            }

            const durationStr = formatDuration(duration);

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.TIMEOUT} User Timed Out`)
                .setDescription(
                    `${DISCO_ICONS.MEMBER} **User:** \`${target.tag}\`\n` +
                    `${DISCO_ICONS.REMINDER} **Duration:** \`${durationStr}\`\n` +
                    `${DISCO_ICONS.INFO} **Reason:** ${reason}` +
                    (strippedRoles.length > 0 ? `\n${DISCO_ICONS.WARNING} **Roles quitados:** ${strippedRoles.length} (se devolverán al quitar timeout)` : '')
                )
                .setColor(0x2B2D31)
                .setThumbnail(target.displayAvatarURL());

            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            // If timeout failed but we stripped roles, restore them
            if (strippedRoles.length > 0) {
                await member.roles.add(strippedRoles).catch(() => { });
            }
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** Failed to timeout user.`)
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }
    }
};
