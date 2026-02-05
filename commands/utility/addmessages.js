const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const UserStats = require('../../models/UserStats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmessages')
        .setDescription('Add messages to a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'No tienes permiso.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        await this.handleAdd(interaction, user, amount);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const user = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (user && !isNaN(amount)) {
            await this.handleAdd(message, user, amount);
        } else {
            message.reply('Uso: .addmessages <user> <amount>');
        }
    },

    async handleAdd(source, user, amount) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        try {
            await UserStats.findOneAndUpdate(
                { guildId: source.guild.id, userId: user.id },
                { $inc: { messageCount: amount } },
                { upsert: true, new: true }
            );
            await reply({ content: `${DISCO_ICONS.CHECKMARK} Se han añadido **${amount}** mensajes a ${user.tag}.`, ephemeral: true });
        } catch (e) {
            await reply({ content: `Error: ${e.message}`, ephemeral: true });
        }
    }
};












