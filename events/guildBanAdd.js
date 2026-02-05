const { Events, EmbedBuilder } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        const logData = await getLogChannel(ban.guild, LOG_TYPES.BANS);
        if (!logData) return;

        const audit = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        const reason = audit?.reason || ban.reason || 'Sin razón especificada';

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.BAN)
            .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.BAN} Usuario Baneado`)
            .addFields(
                { name: `${DISCO_ICONS.USER} Usuario`, value: `${ban.user} (\`${ban.user.id}\`)`, inline: false },
                { name: `${DISCO_ICONS.POINT} Razón`, value: reason, inline: false }
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: `ID: ${ban.user.id}` })
            .setTimestamp();

        if (audit?.executor) {
            embed.addFields({ name: `${DISCO_ICONS.POINT} Baneado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
