const { Events, EmbedBuilder } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

module.exports = {
    name: Events.GuildBanRemove,
    async execute(ban) {
        const logData = await getLogChannel(ban.guild, LOG_TYPES.BANS);
        if (!logData) return;

        const audit = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.UNBAN)
            .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.SUCCESS} Usuario Desbaneado`)
            .addFields(
                { name: `${DISCO_ICONS.USER} Usuario`, value: `${ban.user} (\`${ban.user.id}\`)`, inline: false }
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: `ID: ${ban.user.id}` })
            .setTimestamp();

        if (audit?.executor) {
            embed.addFields({ name: `${DISCO_ICONS.POINT} Desbaneado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
