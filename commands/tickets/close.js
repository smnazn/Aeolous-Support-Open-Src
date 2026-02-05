const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Cierra el ticket actual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),

    async execute(interaction) {
        await this.handleClose(interaction);
    },

    async messageRun(message) {
        await this.handleClose(message);
    },

    async handleClose(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;

        try {
            const ticket = await Ticket.findOne({ channelId: channel.id, status: { $in: ['open', 'claimed'] } });

            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            const executor = source.user || source.author;

            // Block ticket opener from closing
            if (ticket.userId === executor.id) {
                return reply({ embeds: [createErrorEmbed('No puedes cerrar tu propio ticket. Espera a que un staff lo haga.')], ephemeral: true });
            }

            // Ask for confirmation
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close_confirm')
                    .setLabel('Confirmar Cierre')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_close_cancel')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Cerrar Ticket`)
                .setDescription(`> ¿Estás seguro de que quieres cerrar este ticket?\n> Esta acción archivará el canal.`)
                .setColor(0x2B2D31);

            const msg = await reply({ embeds: [embed], components: [row], fetchReply: true });

            // Button collector
            const collector = msg.createMessageComponentCollector({ time: 30000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== (source.user?.id || source.author?.id)) {
                    return i.reply({ content: 'No puedes usar estos botones.', ephemeral: true });
                }

                if (i.customId === 'ticket_close_confirm') {
                    // Close the ticket
                    ticket.status = 'closed';
                    ticket.closedAt = new Date();
                    ticket.closedBy = i.user.id;
                    await ticket.save();

                    const closedEmbed = createSuccessEmbed(
                        'Ticket Cerrado',
                        `> **Cerrado por:** ${i.user}\n> **Este canal será eliminado en 5 segundos.**`
                    );

                    await i.update({ embeds: [closedEmbed], components: [] });

                    // Delete channel after delay
                    setTimeout(async () => {
                        try {
                            await channel.delete();
                        } catch (e) {
                            console.error('Error deleting ticket channel:', e);
                        }
                    }, 5000);
                } else if (i.customId === 'ticket_close_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.CHECKMARK} Cierre cancelado.`)
                        .setColor(0x2B2D31);
                    await i.update({ embeds: [cancelEmbed], components: [] });
                }

                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    try {
                        const timeoutEmbed = new EmbedBuilder()
                            .setDescription(`${DISCO_ICONS.CROSSMARK} Tiempo agotado. Cierre cancelado.`)
                            .setColor(0x2B2D31);
                        await msg.edit({ embeds: [timeoutEmbed], components: [] });
                    } catch { }
                }
            });

        } catch (error) {
            console.error('Error closing ticket:', error);
            await reply({ embeds: [createErrorEmbed('Error al cerrar el ticket.')], ephemeral: true });
        }
    }
};












