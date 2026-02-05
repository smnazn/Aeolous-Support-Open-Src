const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed, ICONS } = require('../../utils/helpers');

const STAFF_ROLE_ID = '1386894648144035891';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Comandos de administración de tickets')
        .addSubcommand(sub =>
            sub.setName('unclaim')
                .setDescription('Liberar un ticket forzosamente (Solo Admins)')
        )
        .addSubcommand(sub =>
            sub.setName('unblock')
                .setDescription('Desbloquear un ticket forzosamente (Solo Admins)')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [createErrorEmbed('No tienes permiso para usar comandos de admin.')], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'unclaim') {
            await this.handleUnclaim(interaction);
        } else if (subcommand === 'unblock') {
            await this.handleUnblock(interaction);
        }
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'unclaim') {
            await this.handleUnclaim(message);
        } else if (subcommand === 'unblock') {
            await this.handleUnblock(message);
        } else {
            message.reply('Uso: .admin <unclaim|unblock>');
        }
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
            const oldClaimerId = ticket.claimedBy;

            ticket.claimedBy = null;
            ticket.status = 'open';
            await ticket.save();

            try {
                await source.channel.permissionOverwrites.delete(oldClaimerId);
            } catch (e) { }

            await source.channel.setName(source.channel.name.replace('claimed-', 'ticket-'));

            const embed = createSuccessEmbed('Ticket Liberado (Admin)',
                `> **Por:** ${member} (Admin)\n> **Anterior Staff:** <@${oldClaimerId}>\n> **Estado:** Ahora está abierto para otros staffs.`
            );
            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error admin unclaiming ticket:', error);
            await reply({ embeds: [createErrorEmbed('Falló al liberar el ticket.')], ephemeral: true });
        }
    },

    async handleUnblock(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const ticket = await Ticket.findOne({ channelId: source.channel.id, status: { $in: ['open', 'claimed'] } });
            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            // Restore permissions for staff role
            try {
                await source.channel.permissionOverwrites.edit(STAFF_ROLE_ID, {
                    SendMessages: true,
                    ViewChannel: true,
                    ReadMessageHistory: true
                });
            } catch (e) { }

            ticket.blocked = false;
            await ticket.save();

            const embed = createSuccessEmbed('Ticket Desbloqueado (Admin)',
                `> **Por:** ${source.member} (Admin)\n> Otros staffs pueden volver a enviar mensajes.`
            );
            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error admin unblocking ticket:', error);
            await reply({ embeds: [createErrorEmbed('Falló al desbloquear el ticket.')], ephemeral: true });
        }
    }
};











