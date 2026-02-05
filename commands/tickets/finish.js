const { SlashCommandBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');
const { getStaffRole } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('finish')
        .setDescription('Notifica al staff que terminaste el formulario'),

    async execute(interaction) {
        await this.handleFinish(interaction);
    },

    async messageRun(message) {
        await this.handleFinish(message);
    },

    async handleFinish(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const executor = source.user || source.author;
        const guildId = source.guild.id;

        try {
            const ticket = await Ticket.findOne({ channelId: channel.id, status: { $in: ['open', 'claimed'] } });

            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este comando solo funciona en tickets.')], ephemeral: true });
            }

            // Only ticket opener can use this command
            if (ticket.userId !== executor.id) {
                return reply({ embeds: [createErrorEmbed('Solo el creador del ticket puede usar este comando.')], ephemeral: true });
            }

            // Check if already used
            if (ticket.finishUsed) {
                return reply({ embeds: [createErrorEmbed('Ya usaste este comando. Espera a que un staff te atienda.')], ephemeral: true });
            }

            // Get staff role from config
            const staffRoleId = await getStaffRole(guildId);
            if (!staffRoleId) {
                return reply({ embeds: [createErrorEmbed('No hay un rol de staff configurado. Un admin debe usar `/setup staff @rol`.')], ephemeral: true });
            }

            // Mark as used
            ticket.finishUsed = true;
            await ticket.save();

            // Ping staff role with message
            await channel.send(`<@&${staffRoleId}> **Admins,** ${executor} ha terminado su formulario de postulación.`);

            // Delete the command message if it's a prefix command
            if (source.delete) {
                try { await source.delete(); } catch (e) { }
            } else {
                // If slash command, reply ephemerally
                await source.reply({ content: '✅', ephemeral: true });
            }

        } catch (error) {
            console.error('Error in finish command:', error);
            await reply({ embeds: [createErrorEmbed('Error al notificar.')], ephemeral: true });
        }
    }
};











