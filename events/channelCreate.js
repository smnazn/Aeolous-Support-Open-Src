const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

const CHANNEL_TYPES = {
    [ChannelType.GuildText]: 'Texto',
    [ChannelType.GuildVoice]: 'Voz',
    [ChannelType.GuildCategory]: 'Categoría',
    [ChannelType.GuildAnnouncement]: 'Anuncios',
    [ChannelType.GuildStageVoice]: 'Stage',
    [ChannelType.GuildForum]: 'Foro'
};

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;

        const logData = await getLogChannel(channel.guild, LOG_TYPES.CHANNELS);
        if (!logData) return;

        const audit = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.CREATE)
            .setTitle(`${DISCO_ICONS.SUCCESS} Canal Creado`)
            .addFields(
                { name: `${DISCO_ICONS.POINT} Canal`, value: `${channel} (\`#${channel.name}\`)`, inline: true },
                { name: `${DISCO_ICONS.POINT} Tipo`, value: CHANNEL_TYPES[channel.type] || 'Desconocido', inline: true },
                { name: `${DISCO_ICONS.POINT} ID`, value: `\`${channel.id}\``, inline: true }
            )
            .setFooter({ text: `ID: ${channel.id}` })
            .setTimestamp();

        if (channel.parent) {
            embed.addFields({ name: `${DISCO_ICONS.POINT} Categoría`, value: channel.parent.name, inline: true });
        }

        if (audit?.executor) {
            embed.addFields({ name: `${DISCO_ICONS.USER} Creado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
