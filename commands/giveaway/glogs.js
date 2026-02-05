const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('glogs')
        .setDescription('Muestra el historial de giveaways'),

    async execute(interaction) {
        await this.handleLogs(interaction, 0);
    },

    async messageRun(message, args) {
        await this.handleLogs(message, 0);
    },

    async handleLogs(source, page) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const perPage = 5;

        try {
            const total = await Giveaway.countDocuments({ guildId });
            const totalPages = Math.ceil(total / perPage);

            if (total === 0) {
                return reply({ content: `${DISCO_ICONS.INFO} No hay giveaways en este servidor.`, ephemeral: true });
            }

            const giveaways = await Giveaway.find({ guildId })
                .sort({ createdAt: -1 })
                .skip(page * perPage)
                .limit(perPage);

            const description = giveaways.map((g, i) => {
                const status = g.status === 'active' ? '🟢 Activo' : '🔴 Terminado';
                const time = Math.floor(new Date(g.createdAt).getTime() / 1000);
                const winners = g.winners?.length > 0
                    ? g.winners.map(w => `<@${w}>`).join(', ')
                    : 'Sin ganador';
                return `**${page * perPage + i + 1}.** ${g.prize}\n` +
                    `${DISCO_ICONS.POINT} Estado: ${status}\n` +
                    `${DISCO_ICONS.POINT} Host: <@${g.hostId}>\n` +
                    `${DISCO_ICONS.POINT} Ganador(es): ${winners}\n` +
                    `${DISCO_ICONS.POINT} Fecha: <t:${time}:R>`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.GIVEAWAY} Historial de Giveaways`)
                .setDescription(description)
                .setColor(0x2B2D31)
                .setFooter({ text: `Página ${page + 1}/${totalPages} • Total: ${total} giveaways` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`glogs_prev_${page}`)
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`glogs_next_${page}`)
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            );

            const msg = await reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== (source.user?.id || source.author?.id)) {
                    return i.reply({ content: 'No puedes usar estos botones.', ephemeral: true });
                }

                let newPage = page;
                if (i.customId.startsWith('glogs_prev')) newPage = Math.max(0, page - 1);
                if (i.customId.startsWith('glogs_next')) newPage = Math.min(totalPages - 1, page + 1);

                const newGiveaways = await Giveaway.find({ guildId })
                    .sort({ createdAt: -1 })
                    .skip(newPage * perPage)
                    .limit(perPage);

                const newDescription = newGiveaways.map((g, idx) => {
                    const status = g.status === 'active' ? '🟢 Activo' : '🔴 Terminado';
                    const time = Math.floor(new Date(g.createdAt).getTime() / 1000);
                    const winners = g.winners?.length > 0
                        ? g.winners.map(w => `<@${w}>`).join(', ')
                        : 'Sin ganador';
                    return `**${newPage * perPage + idx + 1}.** ${g.prize}\n` +
                        `${DISCO_ICONS.POINT} Estado: ${status}\n` +
                        `${DISCO_ICONS.POINT} Host: <@${g.hostId}>\n` +
                        `${DISCO_ICONS.POINT} Ganador(es): ${winners}\n` +
                        `${DISCO_ICONS.POINT} Fecha: <t:${time}:R>`;
                }).join('\n\n');

                embed.setDescription(newDescription)
                    .setFooter({ text: `Página ${newPage + 1}/${totalPages} • Total: ${total} giveaways` });

                row.components[0].setDisabled(newPage === 0);
                row.components[1].setDisabled(newPage >= totalPages - 1);

                await i.update({ embeds: [embed], components: [row] });
                page = newPage;
            });

            collector.on('end', () => {
                row.components.forEach(b => b.setDisabled(true));
                msg.edit({ components: [row] }).catch(() => { });
            });

        } catch (error) {
            console.error('Error fetching giveaway logs:', error);
            await reply({ content: '❌ Error al obtener el historial.', ephemeral: true });
        }
    }
};
