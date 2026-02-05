const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unblock')
        .setDescription('Desbloquea un ticket para que otros staffs puedan hablar.')
        .addUserOption(o => o.setName('user').setDescription('Usuario específico a desbloquear (opcional)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        await this.handleUnblock(interaction, user ? [user] : null);
    },

    async messageRun(message) {
        const mentionedUsers = message.mentions.users.size > 0 ? [...message.mentions.users.values()] : null;
        await this.handleUnblock(message, mentionedUsers);
    },

    async handleUnblock(source, specificUsers = null) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const executor = source.user || source.author;

        try {
            const ticket = await Ticket.findOne({ channelId: channel.id, status: { $in: ['open', 'claimed'] } });

            if (!ticket) {
                return reply({ embeds: [createErrorEmbed('Este canal no es un ticket activo.')], ephemeral: true });
            }

            if (!ticket.claimedBy) {
                return reply({ embeds: [createErrorEmbed('Este ticket no está reclamado.')], ephemeral: true });
            }

            // Only the claimer can unblock
            if (ticket.claimedBy !== executor.id) {
                return reply({ embeds: [createErrorEmbed('Solo el staff que reclamó este ticket puede desbloquearlo.')], ephemeral: true });
            }

            if (specificUsers && specificUsers.length > 0) {
                // Unblock specific users only
                for (const user of specificUsers) {
                    await channel.permissionOverwrites.edit(user.id, {
                        SendMessages: true,
                        ViewChannel: true,
                        ReadMessageHistory: true
                    });
                }

                const userMentions = specificUsers.map(u => `<@${u.id}>`).join(', ');
                const successEmbed = createSuccessEmbed(
                    'Usuarios Desbloqueados',
                    `> Los siguientes usuarios ahora pueden escribir:\n> ${userMentions}`
                );
                await reply({ embeds: [successEmbed] });

            } else {
                // Full unblock - restore staff role permissions
                const config = await GuildConfig.findOne({ guildId: source.guild.id });
                const staffRoleId = config?.staffRoleId;

                if (staffRoleId) {
                    try {
                        await channel.permissionOverwrites.edit(staffRoleId, {
                            SendMessages: true,
                            ViewChannel: true,
                            ReadMessageHistory: true
                        });
                    } catch (e) { }
                }

                ticket.blocked = false;
                await ticket.save();

                const successEmbed = createSuccessEmbed(
                    'Ticket Desbloqueado',
                    `> Este ticket ya no está restringido.\n> Todos los staffs pueden volver a enviar mensajes.`
                );
                await reply({ embeds: [successEmbed] });
            }

        } catch (error) {
            console.error('Error unblocking ticket:', error);
            await reply({ embeds: [createErrorEmbed('Error al desbloquear el ticket.')], ephemeral: true });
        }
    }
};











