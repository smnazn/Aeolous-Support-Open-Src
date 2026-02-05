const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

const PERMISSION_NAMES = {
    ViewChannel: 'Ver Canal',
    SendMessages: 'Enviar Mensajes',
    ManageMessages: 'Gestionar Mensajes',
    EmbedLinks: 'Insertar Enlaces',
    AttachFiles: 'Adjuntar Archivos',
    ReadMessageHistory: 'Leer Historial',
    MentionEveryone: 'Mencionar @everyone',
    UseExternalEmojis: 'Emojis Externos',
    AddReactions: 'Añadir Reacciones',
    Connect: 'Conectar',
    Speak: 'Hablar',
    MuteMembers: 'Silenciar Miembros',
    DeafenMembers: 'Ensordecer Miembros',
    MoveMembers: 'Mover Miembros',
    ManageChannels: 'Gestionar Canal'
};

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        const logData = await getLogChannel(newChannel.guild, LOG_TYPES.CHANNELS);
        if (!logData) return;

        const changes = [];

        // Detectar cambios
        if (oldChannel.name !== newChannel.name) {
            changes.push({ name: 'Nombre', before: oldChannel.name, after: newChannel.name });
        }
        if (oldChannel.topic !== newChannel.topic) {
            changes.push({ name: 'Tema', before: oldChannel.topic || '*Sin tema*', after: newChannel.topic || '*Sin tema*' });
        }
        if (oldChannel.nsfw !== newChannel.nsfw) {
            changes.push({ name: 'NSFW', before: oldChannel.nsfw ? 'Sí' : 'No', after: newChannel.nsfw ? 'Sí' : 'No' });
        }
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            changes.push({
                name: 'Slowmode',
                before: oldChannel.rateLimitPerUser ? `${oldChannel.rateLimitPerUser}s` : 'Desactivado',
                after: newChannel.rateLimitPerUser ? `${newChannel.rateLimitPerUser}s` : 'Desactivado'
            });
        }

        const permChanges = getPermissionChanges(oldChannel, newChannel);

        if (changes.length === 0 && permChanges.length === 0) return;

        const audit = await getAuditExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.UPDATE)
            .setTitle(`${DISCO_ICONS.INFO} Canal Actualizado`)
            .setDescription(`${newChannel} fue modificado`)
            .setFooter({ text: `ID: ${newChannel.id}` })
            .setTimestamp();

        for (const change of changes) {
            embed.addFields({
                name: `${DISCO_ICONS.POINT} ${change.name}`,
                value: `**Antes:** ${change.before}\n**Después:** ${change.after}`,
                inline: false
            });
        }

        if (permChanges.length > 0) {
            const permText = permChanges.slice(0, 5).join('\n');
            embed.addFields({
                name: `${DISCO_ICONS.LOCK} Cambios de Permisos`,
                value: permText + (permChanges.length > 5 ? `\n...y ${permChanges.length - 5} más` : ''),
                inline: false
            });
        }

        if (audit?.executor) {
            embed.addFields({ name: `${DISCO_ICONS.USER} Modificado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};

function getPermissionChanges(oldChannel, newChannel) {
    const changes = [];
    const oldOverwrites = new Map(oldChannel.permissionOverwrites.cache);
    const newOverwrites = new Map(newChannel.permissionOverwrites.cache);

    for (const [id, newOverwrite] of newOverwrites) {
        const oldOverwrite = oldOverwrites.get(id);
        const target = newChannel.guild.roles.cache.get(id) || newChannel.guild.members.cache.get(id);
        const targetName = target?.name || target?.user?.tag || id;

        if (!oldOverwrite) {
            changes.push(`${DISCO_ICONS.SUCCESS} Permisos añadidos para **${targetName}**`);
        } else {
            for (const [perm, name] of Object.entries(PERMISSION_NAMES)) {
                const flag = PermissionsBitField.Flags[perm];
                if (!flag) continue;

                const wasAllowed = oldOverwrite.allow.has(flag);
                const wasDenied = oldOverwrite.deny.has(flag);
                const isAllowed = newOverwrite.allow.has(flag);
                const isDenied = newOverwrite.deny.has(flag);

                if (wasAllowed !== isAllowed || wasDenied !== isDenied) {
                    let status = 'Neutral';
                    if (isAllowed) status = `${DISCO_ICONS.SUCCESS} Permitido`;
                    else if (isDenied) status = `${DISCO_ICONS.ERROR} Denegado`;
                    changes.push(`**${targetName}** - ${name}: ${status}`);
                }
            }
        }
    }

    for (const [id] of oldOverwrites) {
        if (!newOverwrites.has(id)) {
            const target = newChannel.guild.roles.cache.get(id) || newChannel.guild.members.cache.get(id);
            const targetName = target?.name || target?.user?.tag || id;
            changes.push(`${DISCO_ICONS.ERROR} Permisos removidos para **${targetName}**`);
        }
    }

    return changes;
}
