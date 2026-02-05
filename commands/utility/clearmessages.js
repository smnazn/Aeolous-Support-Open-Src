const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const UserStats = require('../../models/UserStats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearmessages')
        .setDescription('Reset message count for a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'No tienes permiso.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        await this.handleClear(interaction, user);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const user = message.mentions.users.first();

        if (user) {
            await this.handleClear(message, user);
        } else {
            message.reply('Uso: .clearmessages <user>');
        }
    },

    async handleClear(source, user) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        try {
            await UserStats.findOneAndUpdate(
                { guildId: source.guild.id, userId: user.id },
                { $set: { messageCount: 0, dailyMessageCount: 0 } },
                { upsert: true }
            );
            await reply({ content: `${DISCO_ICONS.CHECKMARK} Se han reseteado los mensajes de ${user.tag}.`, ephemeral: true });
        } catch (e) {
            await reply({ content: `Error: ${e.message}`, ephemeral: true });
        }
    }
};












