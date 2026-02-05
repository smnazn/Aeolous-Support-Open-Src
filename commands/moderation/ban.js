const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user.')
        .addUserOption(option => option.setName('target').setDescription('The user to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        await this.handleBan(interaction, target, reason);
    },
    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return this.replyError(message, 'You do not have permission to ban members.');
        }
        if (args.length === 0) {
            const prefix = await getPrefix(message.guild.id);
            return message.reply(`Usage: ${prefix}ban <user/ID> [reason]`);
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

        const reason = args.slice(1).join(' ') || 'No reason provided';
        await this.handleBan(message, target, reason);
    },
    async handleBan(source, target, reason) {
        const member = await source.guild.members.fetch(target.id).catch(() => null);
        const executor = source.user || source.author;

        // Owner protection - owners can't be banned and can't ban each other
        const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim());
        const targetIsOwner = ownerIds.includes(target.id);
        const executorIsOwner = ownerIds.includes(executor.id);

        if (targetIsOwner) {
            return this.replyError(source, 'You cannot ban a bot owner.');
        }

        if (executorIsOwner && ownerIds.includes(target.id)) {
            return this.replyError(source, 'Owners cannot ban each other.');
        }

        // Security Checks (Self & Hierarchy) - Owner Bypass
        if (!executorIsOwner) {
            if (target.id === executor.id) {
                return this.replyError(source, 'You cannot ban yourself.');
            }

            if (member) {
                const targetHighestRole = member.roles.highest.position;
                const executorHighestRole = source.member.roles.highest.position;

                if (targetHighestRole >= executorHighestRole) {
                    return this.replyError(source, 'You cannot ban a member with a higher or equal role.');
                }
            }
        }

        if (!member) {
            return this.replyError(source, 'User not found in this server.');
        }

        if (!member.bannable) {
            return this.replyError(source, 'I cannot ban this user.');
        }

        try {
            await member.ban({ reason });

            const embed = createSuccessEmbed(
                'User Banned',
                `${ICONS.POINT} **User:** ${target.tag}\n${ICONS.POINT} **Reason:** ${reason}`
            ).setThumbnail(target.displayAvatarURL());

            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return this.replyError(source, 'Failed to ban user.');
        }
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};











