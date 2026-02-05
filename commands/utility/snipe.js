const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const DeletedMessage = require('../../models/DeletedMessage');
const SnipeOptOut = require('../../models/SnipeOptOut');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('View deleted messages or toggle snipe for yourself.')
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('View deleted messages in this channel')
        )
        .addSubcommand(sub => sub
            .setName('toggle')
            .setDescription('Toggle whether your deleted messages can be sniped')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'toggle') {
            await this.handleToggle(interaction);
        } else {
            await this.handleSnipe(interaction);
        }
    },

    async messageRun(message, args) {
        if (args[0]?.toLowerCase() === 'toggle') {
            await this.handleToggle(message);
        } else {
            await this.handleSnipe(message);
        }
    },

    async handleToggle(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const user = source.user || source.author;

        try {
            let optOut = await SnipeOptOut.findOne({ userId: user.id });

            if (optOut) {
                // Toggle the current state
                optOut.optedOut = !optOut.optedOut;
                optOut.updatedAt = new Date();
                await optOut.save();
            } else {
                // Create new opt-out (default: opted out)
                optOut = await SnipeOptOut.create({ userId: user.id, optedOut: true });
            }

            const statusEmoji = optOut.optedOut ? DISCO_ICONS.SUCCESS : DISCO_ICONS.WARNING;
            const statusText = optOut.optedOut
                ? 'Tus mensajes eliminados **ya no serán guardados** para snipe.'
                : 'Tus mensajes eliminados **ahora serán guardados** para snipe.';

            const embed = new EmbedBuilder()
                .setColor(optOut.optedOut ? '#00FF00' : '#FFA500')
                .setDescription(`${statusEmoji} ${statusText}`);

            return reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error toggling snipe opt-out:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error al cambiar la configuración.`);
            return reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleSnipe(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const user = source.user || source.author;

        try {
            const messages = await DeletedMessage.find({
                guildId: source.guild.id,
                channelId: source.channel.id
            })
                .sort({ deletedAt: -1 })
                .limit(50);

            if (!messages || messages.length === 0) {
                return this.sendError(source, 'No hay mensajes eliminados recientes.');
            }

            const perPage = 5;
            const totalPages = Math.ceil(messages.length / perPage);
            let page = 0;

            const getEmbed = (p) => {
                const start = p * perPage;
                const pageMessages = messages.slice(start, start + perPage);

                const description = pageMessages.map((msg, idx) => {
                    const time = Math.floor(new Date(msg.deletedAt).getTime() / 1000);
                    const content = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
                    const hasAttachment = msg.attachments?.length > 0 ? ' 📎' : '';
                    return `**${start + idx + 1}.** <t:${time}:R>\n> **${msg.authorTag}**: ${content}${hasAttachment}`;
                }).join('\n\n');

                return new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.DELETED} Mensajes Eliminados`)
                    .setDescription(description)
                    .setColor(0x2B2D31)
                    .setFooter({ text: `Página ${p + 1}/${totalPages} • Total: ${messages.length} mensajes` });
            };

            const getRow = (p) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`snipe_prev_${p}`)
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId(`snipe_next_${p}`)
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

                if (i.customId.startsWith('snipe_prev')) page = Math.max(0, page - 1);
                if (i.customId.startsWith('snipe_next')) page = Math.min(totalPages - 1, page + 1);

                await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
            });

            collector.on('end', () => {
                const disabledRow = getRow(page);
                disabledRow.components.forEach(b => b.setDisabled(true));
                msg.edit({ components: [disabledRow] }).catch(() => { });
            });

        } catch (error) {
            console.error('Error fetching deleted messages:', error);
            this.sendError(source, 'Error al obtener mensajes.');
        }
    },

    async sendError(source, text) {
        const errorEmbed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} Info`)
            .setDescription(`> **${text}**`)
            .setColor(0x2B2D31);

        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [errorEmbed] });
    }
};
