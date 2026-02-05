const { Events, EmbedBuilder } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, formatDuration,
    LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const logData = await getLogChannel(newMember.guild);
        if (!logData) return;

        const { config, channel } = logData;

        // Cambios de nickname
        if (config.logNickChanges && oldMember.nickname !== newMember.nickname) {
            await logNicknameChange(channel, oldMember, newMember);
        }

        // Cambios de roles
        if (config.logRoleChanges) {
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

            if (addedRoles.size > 0) await logRoleChange(channel, newMember, addedRoles, true);
            if (removedRoles.size > 0) await logRoleChange(channel, newMember, removedRoles, false);
        }

        // Cambios de timeout
        if (config.logTimeouts) {
            const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
            const newTimeout = newMember.communicationDisabledUntilTimestamp;
            if (oldTimeout !== newTimeout) {
                await logTimeoutChange(channel, oldMember, newMember, oldTimeout, newTimeout);
            }
        }
    }
};

async function logNicknameChange(channel, oldMember, newMember) {
    const oldNick = oldMember.nickname || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.username;
    const audit = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

    const embed = new EmbedBuilder()
        .setColor(LOG_COLORS.UPDATE)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(`${DISCO_ICONS.USER} Nickname Cambiado`)
        .addFields(
            { name: `${DISCO_ICONS.USER} Usuario`, value: `${newMember} (\`${newMember.id}\`)`, inline: false },
            { name: `${DISCO_ICONS.POINT} Antes`, value: `\`${oldNick}\``, inline: true },
            { name: `${DISCO_ICONS.POINT} Después`, value: `\`${newNick}\``, inline: true }
        )
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();

    if (audit?.executor) {
        embed.addFields({ name: `${DISCO_ICONS.ADMIN} Cambiado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
    }

    await channel.send({ embeds: [embed] }).catch(() => { });
}

async function logRoleChange(channel, member, roles, isAdded) {
    const roleList = roles.map(r => r.toString()).join(', ');
    const audit = await getAuditExecutor(member.guild, AuditLogEvent.MemberRoleUpdate, member.id);

    const embed = new EmbedBuilder()
        .setColor(isAdded ? LOG_COLORS.CREATE : LOG_COLORS.DELETE)
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setTitle(`${isAdded ? DISCO_ICONS.SUCCESS : DISCO_ICONS.ERROR} Roles ${isAdded ? 'Añadidos' : 'Removidos'}`)
        .addFields(
            { name: `${DISCO_ICONS.USER} Usuario`, value: `${member} (\`${member.id}\`)`, inline: false },
            { name: `${DISCO_ICONS.POINT} ${isAdded ? 'Roles Añadidos' : 'Roles Removidos'}`, value: roleList, inline: false }
        )
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp();

    if (audit?.executor) {
        embed.addFields({ name: `${DISCO_ICONS.ADMIN} Modificado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
    }

    await channel.send({ embeds: [embed] }).catch(() => { });
}

async function logTimeoutChange(channel, oldMember, newMember, oldTimeout, newTimeout) {
    const isTimedOut = newTimeout && newTimeout > Date.now();
    const audit = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

    if (isTimedOut) {
        const duration = newTimeout - Date.now();
        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.TIMEOUT)
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.TIMEOUT} Usuario en Timeout`)
            .setDescription(`${newMember} ha sido puesto en timeout por **${formatDuration(duration)}**`)
            .addFields(
                { name: `${DISCO_ICONS.USER} Usuario`, value: `${newMember} (\`${newMember.id}\`)`, inline: true },
                { name: `${DISCO_ICONS.POINT} Duración`, value: formatDuration(duration), inline: true },
                { name: `${DISCO_ICONS.POINT} Termina`, value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `ID: ${newMember.id}` })
            .setTimestamp();

        if (audit?.reason) embed.addFields({ name: `${DISCO_ICONS.POINT} Razón`, value: audit.reason, inline: false });
        if (audit?.executor) embed.addFields({ name: `${DISCO_ICONS.POINT} Aplicado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });

        await channel.send({ embeds: [embed] }).catch(() => { });
    } else if (oldTimeout && oldTimeout > Date.now()) {
        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.UNBAN)
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.SUCCESS} Timeout Removido`)
            .setDescription(`El timeout de ${newMember} ha sido removido`)
            .addFields({ name: `${DISCO_ICONS.USER} Usuario`, value: `${newMember} (\`${newMember.id}\`)`, inline: false })
            .setFooter({ text: `ID: ${newMember.id}` })
            .setTimestamp();

        if (audit?.executor) embed.addFields({ name: `${DISCO_ICONS.ADMIN} Removido por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });

        await channel.send({ embeds: [embed] }).catch(() => { });
    }
}
