const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Lock = require('../../models/Lock');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloquea el canal actual para que nadie pueda hablar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await this.handleLock(interaction);
    },

    async messageRun(message) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [createErrorEmbed('No tienes permiso para gestionar canales.')] });
        }
        await this.handleLock(message);
    },

    async handleLock(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const guild = source.guild;

        try {
            // Check if already locked in DB
            const existingLock = await Lock.findOne({ channelId: channel.id });
            if (existingLock) {
                return reply({ embeds: [createErrorEmbed('Este canal ya está bloqueado en la base de datos.')], ephemeral: true });
            }

            const backups = [];
            const everyoneRole = guild.roles.everyone;
            const everyoneOw = channel.permissionOverwrites.cache.get(everyoneRole.id);

            // 1. Backup @everyone permission
            // Determine current state: 'allow' if explicit Allow, 'deny' if explicit Deny, else 'unset'
            let stateEveryone = 'unset';
            if (everyoneOw) {
                if (everyoneOw.allow.has(PermissionFlagsBits.SendMessages)) stateEveryone = 'allow';
                else if (everyoneOw.deny.has(PermissionFlagsBits.SendMessages)) stateEveryone = 'deny';
            }

            // Only backup if it's not already denied (if it is denied, locking does nothing new regarding everyone, but we might still need to lock specific roles)
            // Actually, we should force deny it.
            if (stateEveryone !== 'deny') {
                backups.push({ id: everyoneRole.id, state: stateEveryone });
                await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
            }

            // 2. Backup and lock roles that explicitly have "Send Messages" allowed
            const roleOverwrites = channel.permissionOverwrites.cache.filter(o =>
                o.type === 0 && // Role
                o.id !== everyoneRole.id &&
                o.allow.has(PermissionFlagsBits.SendMessages)
            );

            for (const [id] of roleOverwrites) {
                backups.push({ id: id, state: 'allow' });
                await channel.permissionOverwrites.edit(id, { SendMessages: false });
            }

            // Save to DB
            await Lock.create({
                guildId: guild.id,
                channelId: channel.id,
                backups
            });

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Canal Bloqueado**\n` +
                    `<:blocked:1449955403109498932> **Este canal ha sido bloqueado.**\n` +
                    `Nadie puede enviar mensajes hasta que sea desbloqueado.`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error locking channel:', error);
            await reply({ embeds: [createErrorEmbed('Hubo un error al intentar bloquear el canal.')], ephemeral: true });
        }
    }
};
