const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user.')
        .addStringOption(option => option.setName('userid').setDescription('The user ID to unban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for unban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        await this.handleUnban(interaction, userId, reason);
    },
    async messageRun(message, args) {
        const isOwner = message.author.id === process.env.OWNER_ID || (process.env.OWNER_ID || '').split(',').includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> **Error:** You do not have permission to ban members.')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Unban User`)
                .setDescription(`> **Usage:** \`.unban <userid> [reason]\`\n\n${DISCO_ICONS.POINT} Provide the user ID to unban`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await this.handleUnban(message, userId, reason);
    },
    async handleUnban(source, userId, reason) {
        try {
            await source.guild.members.unban(userId, reason);

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.SUCCESS} User Unbanned`)
                .setDescription(`> **User ID:** \`${userId}\`\n> **Reason:** \`${reason}\`\n\n${DISCO_ICONS.POINT} User has been unbanned`)
                .setColor(0x2B2D31);

            if (source.reply) await source.reply({ embeds: [embed] });
            else await source.channel.send({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('<:deny:1448831817963536506> Error')
                .setDescription('> **User not found or not banned**')
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }
    }
};












