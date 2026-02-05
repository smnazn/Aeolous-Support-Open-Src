const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketstats')
        .setDescription('Muestra estadísticas de tickets')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Ver estadísticas de un usuario específico')),

    async execute(interaction) {
        await this.handleStats(interaction);
    },

    async messageRun(message, args) {
        await this.handleStats(message);
    },

    async handleStats(source) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const user = source.options?.getUser('user') || source.mentions?.users?.first() || source.user || source.author;

        try {
            // Get user stats - use claimedHistory to prevent stat inflation from reclaims
            const claimed = await Ticket.countDocuments({ guildId, claimedHistory: user.id });
            const closed = await Ticket.countDocuments({ guildId, closedBy: user.id });
            const opened = await Ticket.countDocuments({ guildId, userId: user.id });

            // Get top staff - use claimedHistory for accurate counts
            const topStats = await Ticket.aggregate([
                { $match: { guildId, claimedHistory: { $exists: true, $ne: [] } } },
                { $unwind: '$claimedHistory' },
                { $group: { _id: '$claimedHistory', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            const topDescription = topStats.length > 0
                ? topStats.map((s, i) => `\`${i + 1}.\`<@${s._id}>: ${s.count} tickets`).join('\n')
                : 'No hay datos disponibles';

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:member:1448486929246064685> **Estadísticas de ${user.username}**\n\n` +
                    `<:ticket:1448487447460577522> **Tickets Abiertos**\n${opened}\n\n` +
                    `<:newticket:1448143880141799600> **Tickets Reclamados**\n${claimed}\n\n` +
                    `<:deleteticket:1448143876740087838> **Tickets Cerrados**\n${closed}\n\n` +
                    `<:top:1448490747774111834> **Top Staff - Tickets Reclamados**\n${topDescription}`
                )
                .setColor(0x2B2D31)
                .setThumbnail(user.displayAvatarURL());

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await reply({ content: '❌ Error al obtener estadísticas.', ephemeral: true });
        }
    },
};
