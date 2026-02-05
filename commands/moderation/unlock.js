const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Lock = require('../../models/Lock');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloquea el canal actual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await this.handleUnlock(interaction);
    },

    async messageRun(message) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [createErrorEmbed('No tienes permiso para gestionar canales.')] });
        }
        await this.handleUnlock(message);
    },

    async handleUnlock(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;

        try {
            const lockDoc = await Lock.findOne({ channelId: channel.id });
            if (!lockDoc) {
                return reply({ embeds: [createErrorEmbed('Este canal no está bloqueado (o no hay registro en la base de datos).')], ephemeral: true });
            }

            // Restore permissions from backup
            for (const entry of lockDoc.backups) {
                try {
                    // entry.state is 'allow', 'deny', or 'unset'
                    // If 'allow', set SendMessages: true
                    // If 'deny', set SendMessages: false
                    // If 'unset', set SendMessages: null (inherit/default)

                    let newVal = null;
                    if (entry.state === 'allow') newVal = true;
                    if (entry.state === 'deny') newVal = false;

                    await channel.permissionOverwrites.edit(entry.id, { SendMessages: newVal });
                } catch (e) {
                    console.error(`Failed to restore overwrite for ${entry.id}:`, e);
                }
            }

            // Specific check for unlockRoleId if legacy data exists (optional, keeping clean for now)
            if (lockDoc.unlockRoleId) {
                try {
                    await channel.permissionOverwrites.edit(lockDoc.unlockRoleId, { SendMessages: true });
                } catch { }
            }

            // Remove from DB
            await Lock.deleteOne({ channelId: channel.id });

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Canal Desbloqueado**\n` +
                    `<:unlocked:1449955377633562755> **Este canal ha sido desbloqueado.**\n` +
                    `Ya se pueden enviar mensajes nuevamente.`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error unlocking channel:', error);
            await reply({ embeds: [createErrorEmbed('Hubo un error al intentar desbloquear el canal.')], ephemeral: true });
        }
    }
};
