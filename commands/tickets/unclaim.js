const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unclaim')
        .setDescription('Liberar el ticket actual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),

    async execute(interaction) {
        await this.handleUnclaim(interaction);
    },

    async messageRun(message) {
        await this.handleUnclaim(message);
    },

    async handleUnclaim(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const ticket = await Ticket.findOne({ channelId: source.channel.id, status: { $in: ['open', 'claimed'] } });
            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            if (!ticket.claimedBy) {
                return reply({ embeds: [createErrorEmbed('Este ticket no está reclamado.')], ephemeral: true });
            }

            const member = source.member;
            const isClaimer = ticket.claimedBy === member.id;
            const canForceUnclaim = member.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!isClaimer && !canForceUnclaim) {
                return reply({ embeds: [createErrorEmbed('Solo puedes liberar tickets que tú reclamaste.')], ephemeral: true });
            }

            const oldClaimerId = ticket.claimedBy;

            // Update DB
            ticket.claimedBy = null;
            ticket.status = 'open';
            await ticket.save();

            // Reset Permissions
            const channel = source.channel;
            try {
                await channel.permissionOverwrites.delete(oldClaimerId);
            } catch (e) { }

            await channel.setName(channel.name.replace('claimed-', 'ticket-'));

            const embed = createSuccessEmbed('Ticket Liberado',
                `> **Por:** ${member}\n> **Este ticket ahora está disponible para otros staffs.**`
            );
            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error unclaiming ticket:', error);
            await reply({ embeds: [createErrorEmbed('Falló al liberar el ticket.')], ephemeral: true });
        }
    }
};











