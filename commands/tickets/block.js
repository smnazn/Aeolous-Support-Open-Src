const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('block')
        .setDescription('Bloquea un ticket para que solo el claimer y el usuario puedan hablar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await this.handleBlock(interaction);
    },

    async messageRun(message) {
        await this.handleBlock(message);
    },

    async handleBlock(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const executor = source.user || source.author;

        try {
            // Find the ticket
            const ticket = await Ticket.findOne({ channelId: channel.id, status: { $in: ['open', 'claimed'] } });

            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            if (!ticket.claimedBy) {
                return reply({ embeds: [createErrorEmbed('Este ticket no ha sido reclamado. Reclámalo primero con `.claim`.')], ephemeral: true });
            }

            // Only the claimer can block the ticket
            if (ticket.claimedBy !== executor.id) {
                return reply({ embeds: [createErrorEmbed('Solo el staff que reclamó este ticket puede bloquearlo.')], ephemeral: true });
            }

            // Get Guild Config for staff role
            const config = await GuildConfig.findOne({ guildId: source.guild.id });
            const staffRoleId = config?.staffRoleId;

            // Get @everyone role
            const everyoneRole = source.guild.roles.everyone;

            // Deny send messages for @everyone
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });

            // Deny send messages for staff role if configured
            if (staffRoleId) {
                try {
                    await channel.permissionOverwrites.edit(staffRoleId, {
                        SendMessages: false
                    });
                } catch (e) {
                    // Role might not exist, ignore
                }
            }

            // Allow ticket opener to send messages
            await channel.permissionOverwrites.edit(ticket.userId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            // Allow claimer to send messages
            await channel.permissionOverwrites.edit(ticket.claimedBy, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                ManageMessages: true
            });

            // Mark ticket as blocked
            ticket.blocked = true;
            await ticket.save();

            const embed = createSuccessEmbed(
                'Ticket Bloqueado',
                `> Este ticket ahora está restringido.\n> Solo <@${ticket.userId}> y <@${ticket.claimedBy}> pueden enviar mensajes.`
            );

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error blocking ticket:', error);
            await reply({ embeds: [createErrorEmbed('Error al bloquear el ticket.')], ephemeral: true });
        }
    }
};











