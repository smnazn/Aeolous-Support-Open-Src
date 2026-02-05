const { Events, EmbedBuilder } = require('discord.js');
const {
    getLogChannel, getAuditExecutor, isChannelIgnored, LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

module.exports = {
    name: Events.MessageBulkDelete,
    async execute(messages, channel) {
        if (!channel.guild) return;

        const logData = await getLogChannel(channel.guild, LOG_TYPES.MESSAGE_DELETE);
        if (!logData) return;
        if (isChannelIgnored(logData.config, channel.id)) return;

        // Get executor with longer time window (10 seconds), passing null for targetId since bulk delete target is unreliable
        const audit = await getAuditExecutor(channel.guild, AuditLogEvent.MessageBulkDelete, null, 10000);
        const messageCount = messages.size;

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.DELETE)
            .setTitle(`${DISCO_ICONS.DELETED} Bulk Delete (Purge)`)
            .setDescription(`**${messageCount} mensajes** eliminados en ${channel}`)
            .addFields(
                { name: `${DISCO_ICONS.POINT} Canal`, value: `${channel}`, inline: true },
                { name: `${DISCO_ICONS.POINT} Cantidad`, value: `\`${messageCount}\` mensajes`, inline: true }
            )
            .setFooter({ text: `Canal ID: ${channel.id}` })
            .setTimestamp();

        if (audit?.executor) {
            embed.addFields({ name: `${DISCO_ICONS.POINT} Ejecutado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        } else {
            embed.addFields({ name: `${DISCO_ICONS.POINT} Ejecutado por`, value: `*No se pudo determinar (puede ser un bot o baja latencia)*`, inline: false });
        }

        // Log de los últimos mensajes (máximo 10)
        const deletedMessages = [...messages.values()]
            .filter(msg => msg.content || msg.attachments?.size > 0)
            .slice(0, 10);

        if (deletedMessages.length > 0) {
            let messageLog = '';
            for (const msg of deletedMessages) {
                if (msg.author) {
                    const content = msg.content?.substring(0, 50) || '[Archivo/Embed]';
                    messageLog += `**${msg.author.tag}:** ${content}${msg.content?.length > 50 ? '...' : ''}\n`;
                }
            }

            if (messageLog) {
                embed.addFields({
                    name: `${DISCO_ICONS.MESSAGE} Mensajes (últimos 10)`,
                    value: messageLog.substring(0, 1024) || '*No se pudo obtener contenido*',
                    inline: false
                });
            }
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
