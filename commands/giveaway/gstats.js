const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gstats')
        .setDescription('Muestra estadísticas de giveaways')
        .addUserOption(option => option.setName('user').setDescription('Ver stats de un usuario específico')),

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
            // User stats
            const hosted = await Giveaway.countDocuments({ guildId, hostId: user.id });
            const won = await Giveaway.countDocuments({ guildId, winners: user.id });
            const participated = await Giveaway.countDocuments({ guildId, participants: user.id });

            // Server stats
            const totalGiveaways = await Giveaway.countDocuments({ guildId });
            const activeGiveaways = await Giveaway.countDocuments({ guildId, status: 'active' });
            const endedGiveaways = await Giveaway.countDocuments({ guildId, status: 'ended' });

            // Top winners
            const topWinners = await Giveaway.aggregate([
                { $match: { guildId } },
                { $unwind: '$winners' },
                { $group: { _id: '$winners', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);

            const topDescription = topWinners.length > 0
                ? topWinners.map((w, i) => `\`${i + 1}.\`<@${w._id}>: ${w.count} wins`).join('\n')
                : 'Sin datos';

            // Top hosts
            const topHosts = await Giveaway.aggregate([
                { $match: { guildId } },
                { $group: { _id: '$hostId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);

            const topHostsDescription = topHosts.length > 0
                ? topHosts.map((h, i) => `\`${i + 1}.\`<@${h._id}>: ${h.count} giveaways`).join('\n')
                : 'Sin datos';

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.GIVEAWAY} Estadísticas de Giveaways`)
                .setDescription(
                    `<:member:1448486929246064685> **Stats de ${user.username}**\n` +
                    `${DISCO_ICONS.POINT} Giveaways ganados: **${won}**\n` +
                    `${DISCO_ICONS.POINT} Participaciones: **${participated}**\n` +
                    `${DISCO_ICONS.POINT} Giveaways hosteados: **${hosted}**\n\n` +
                    `${DISCO_ICONS.INFO} **Stats del servidor**\n` +
                    `${DISCO_ICONS.POINT} Total: **${totalGiveaways}**\n` +
                    `${DISCO_ICONS.POINT} Activos: **${activeGiveaways}**\n` +
                    `${DISCO_ICONS.POINT} Terminados: **${endedGiveaways}**\n\n` +
                    `<:top:1448490747774111834> **Top Ganadores**\n${topDescription}\n\n` +
                    `${DISCO_ICONS.CHECKMARK} **Top Hosts**\n${topHostsDescription}`
                )
                .setColor(0x2B2D31)
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching giveaway stats:', error);
            await reply({ content: '❌ Error al obtener estadísticas.', ephemeral: true });
        }
    }
};
