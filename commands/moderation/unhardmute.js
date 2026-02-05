const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');
const TimeoutRoles = require('../../models/TimeoutRoles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unhardmute')
        .setDescription('Remove hardmute and restore all roles.')
        .addUserOption(option => option.setName('target').setDescription('The user to unhardmute').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for unhardmute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        await this.handleUnhardmute(interaction, target, reason);
    },

    async messageRun(message, args) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return this.replyError(message, 'You do not have permission to moderate members.');
        }
        if (args.length === 0) {
            const prefix = await getPrefix(message.guild.id);
            return message.reply(`Usage: ${prefix}unhardmute <user/ID> [reason]`);
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
        await this.handleUnhardmute(message, target, reason);
    },

    async handleUnhardmute(source, target, reason) {
        const member = await source.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return this.replyError(source, 'User not found in this server.');
        }

        try {
            // Remove timeout
            await member.timeout(null, reason);

            // Restore stripped roles
            const savedRoles = await TimeoutRoles.findOne({ guildId: source.guild.id, userId: member.id });
            let restoredCount = 0;

            if (savedRoles && savedRoles.roles.length > 0) {
                try {
                    await member.roles.add(savedRoles.roles, `Unhardmute - roles restored by ${(source.user || source.author).tag}`);
                    restoredCount = savedRoles.roles.length;
                    await TimeoutRoles.deleteOne({ guildId: source.guild.id, userId: member.id });
                } catch (e) {
                    console.error('Error restoring roles:', e);
                }
            }

            const embed = createSuccessEmbed(
                'User Unhardmuted',
                `${ICONS.POINT} **User:** ${target.tag}\n${ICONS.POINT} **Reason:** ${reason}\n${ICONS.POINT} **Roles restaurados:** ${restoredCount}`
            ).setThumbnail(target.displayAvatarURL());

            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return this.replyError(source, 'Failed to unhardmute user.');
        }
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};
