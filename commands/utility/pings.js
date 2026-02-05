const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Ping = require('../../models/Ping');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pings')
        .setDescription('View your ping history.')
        .addBooleanOption(option => option.setName('clear').setDescription('Clear your ping history').setRequired(false)),
    async execute(interaction) {
        const clear = interaction.options.getBoolean('clear') || false;
        await this.handlePings(interaction, clear);
    },
    async messageRun(message, args) {
        const clear = args[0]?.toLowerCase() === 'clear';
        await this.handlePings(message, clear);
    },
    async handlePings(source, clear) {
        const user = source.user || source.author;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            let pingDoc = await Ping.findOne({
                guildId: source.guild.id,
                userId: user.id
            });

            if (clear) {
                if (pingDoc) {
                    pingDoc.pings = [];
                    pingDoc.lastCleared = new Date();
                    await pingDoc.save();
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.CHECKMARK} Pings Cleared`)
                    .setDescription(`> **Your ping history has been cleared**`)
                    .setColor(0x2B2D31);

                return reply({ embeds: [embed] });
            }

            if (!pingDoc || !pingDoc.pings || pingDoc.pings.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} No Pings`)
                    .setDescription(`> **You have no recent pings**\n\n${DISCO_ICONS.POINT} Pings are tracked automatically`)
                    .setColor(0x2B2D31);

                return reply({ embeds: [embed] });
            }

            // Filter pings from last 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentPings = (pingDoc.pings || [])
                .filter(ping => ping && ping.timestamp && new Date(ping.timestamp) > twentyFourHoursAgo)
                .reverse();

            if (recentPings.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} No Pings`)
                    .setDescription(`> **You have no pings in the last 24 hours**\n\n${DISCO_ICONS.POINT} Pings reset every 24 hours`)
                    .setColor(0x2B2D31);

                return reply({ embeds: [embed] });
            }

            // Pagination
            const perPage = 10;
            const totalPages = Math.ceil(recentPings.length / perPage);
            let page = 0;

            const getEmbed = (p) => {
                const start = p * perPage;
                const displayPings = recentPings.slice(start, start + perPage);
                const pingLines = displayPings.map((ping, index) => {
                    const content = ping.content.length > 30
                        ? ping.content.substring(0, 30) + '...'
                        : ping.content;
                    return `\`#${start + index + 1}\` ${ping.authorTag}: ${content} - [link](${ping.messageUrl})`;
                }).join('\n');

                return new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.PINGS} Your Pings`)
                    .setDescription(pingLines)
                    .setColor(0x2B2D31)
                    .setFooter({ text: `Página ${p + 1}/${totalPages} • Total: ${recentPings.length} pings • .pings clear para limpiar` });
            };

            const getRow = (p) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`pings_prev_${p}`)
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId(`pings_next_${p}`)
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p >= totalPages - 1)
            );

            const msg = await reply({ embeds: [getEmbed(page)], components: totalPages > 1 ? [getRow(page)] : [], fetchReply: true });

            if (totalPages <= 1) return;

            const collector = msg.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== user.id) {
                    return i.reply({ content: 'No puedes usar estos botones.', ephemeral: true });
                }

                if (i.customId.startsWith('pings_prev')) page = Math.max(0, page - 1);
                if (i.customId.startsWith('pings_next')) page = Math.min(totalPages - 1, page + 1);

                await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
            });

            collector.on('end', () => {
                const disabledRow = getRow(page);
                disabledRow.components.forEach(b => b.setDisabled(true));
                msg.edit({ components: [disabledRow] }).catch(() => { });
            });

        } catch (error) {
            console.error('Error fetching pings:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CROSSMARK} Error`)
                .setDescription(`> **Failed to fetch ping history**`)
                .setColor(0x2B2D31);

            await reply({ embeds: [errorEmbed] });
        }
    }
};
