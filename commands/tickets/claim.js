const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Reclama un ticket para atenderlo.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),

    async execute(interaction) {
        await this.handleClaim(interaction);
    },

    async messageRun(message) {
        await this.handleClaim(message);
    },

    async handleClaim(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const executor = source.user || source.author;

        try {
            // Find any ticket in this channel (open or claimed)
            const ticket = await Ticket.findOne({
                channelId: channel.id,
                status: { $in: ['open', 'claimed'] }
            });

            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket.')], ephemeral: true });
            }

            // Check if already claimed by someone else
            if (ticket.claimedBy && ticket.claimedBy !== executor.id) {
                return reply({ embeds: [createErrorEmbed(`Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`)], ephemeral: true });
            }

            // Check if already claimed by this user
            if (ticket.claimedBy === executor.id) {
                return reply({ embeds: [createErrorEmbed('Ya tienes reclamado este ticket.')], ephemeral: true });
            }

            // Claim the ticket
            ticket.claimedBy = executor.id;
            ticket.status = 'claimed';

            // Only the FIRST person to claim gets credit in stats
            // If claimedHistory is empty, this is the first claimer
            if (!ticket.claimedHistory) ticket.claimedHistory = [];
            if (ticket.claimedHistory.length === 0) {
                ticket.claimedHistory.push(executor.id);
            }

            await ticket.save();

            // Update channel permissions - give claimer special access
            try {
                await channel.permissionOverwrites.edit(executor.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    ManageMessages: true
                });
            } catch (e) { }

            // Rename channel
            try {
                if (channel.name.startsWith('ticket-')) {
                    await channel.setName(channel.name.replace('ticket-', 'claimed-'));
                }
            } catch (e) { }

            const embed = createSuccessEmbed(
                'Ticket Reclamado',
                `Ticket reclamado por ${executor}.`
            );

            // Send to channel so everyone can see
            await channel.send({ embeds: [embed] });

            // If it was an interaction, acknowledge it ephemerally
            if (source.reply && source.deferred !== undefined) {
                const { DISCO_ICONS } = require('../../utils/icons');
                await source.reply({ content: DISCO_ICONS.CHECKMARK, ephemeral: true });
            }

        } catch (error) {
            console.error('Error claiming ticket:', error);
            await reply({ embeds: [createErrorEmbed('Error al reclamar el ticket.')], ephemeral: true });
        }
    }
};










