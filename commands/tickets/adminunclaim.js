const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed, ICONS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminunclaim')
        .setDescription('Force unclaim a ticket (Admin Only).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await this.handleUnclaim(interaction);
    },
    async messageRun(message) {
        await this.handleUnclaim(message);
    },
    async handleUnclaim(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        // Explicit Check for Admin permissions (Manage Guild)
        if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return reply({ embeds: [createErrorEmbed('You do not have permission to force unclaim tickets.')], ephemeral: true });
        }

        try {
            const ticket = await Ticket.findOne({ channelId: source.channel.id, status: { $in: ['open', 'claimed'] } });
            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            if (!ticket.claimedBy) {
                return reply({ embeds: [createErrorEmbed('This ticket is not claimed.')], ephemeral: true });
            }

            const member = source.member;

            // Force Unclaim Logic
            const oldClaimerId = ticket.claimedBy;
            ticket.claimedBy = null;
            await ticket.save();

            // Reset Permissions for the OLD claimer
            const channel = source.channel;
            await channel.permissionOverwrites.delete(oldClaimerId);

            await channel.setName(channel.name.replace('claimed-', 'ticket-'));

            const embed = createSuccessEmbed('Ticket Force Unclaimed',
                `> **Unclaimed by:** ${member} (Admin)\n> **Previous Claimer:** <@${oldClaimerId}>\n> **Ticket is now open.**`
            );
            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error admin unclaiming ticket:', error);
            await reply({ embeds: [createErrorEmbed('Failed to unclaim ticket.')], ephemeral: true });
        }
    }
};











