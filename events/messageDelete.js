const { Events, EmbedBuilder } = require('discord.js');
const DeletedMessage = require('../models/DeletedMessage');
const SnipeOptOut = require('../models/SnipeOptOut');
const {
    getLogChannel, getAuditExecutor, isChannelIgnored, truncateText,
    LOG_COLORS, LOG_TYPES, DISCO_ICONS, AuditLogEvent
} = require('../utils/serverLogs');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (message.author?.bot) return;
        if (!message.content && message.attachments.size === 0) return;

        const attachments = message.attachments.map(att => ({
            url: att.url,
            name: att.name
        }));

        // Check if user has opted out of snipe
        try {
            const optOut = await SnipeOptOut.findOne({ userId: message.author.id });

            // Only save if user hasn't opted out
            if (!optOut || !optOut.optedOut) {
                await new DeletedMessage({
                    guildId: message.guild.id,
                    channelId: message.channel.id,
                    authorId: message.author.id,
                    authorTag: message.author.tag,
                    content: message.content || '[No text content]',
                    attachments
                }).save();
            }
        } catch (err) {
            console.error('Error saving deleted message:', err);
        }

        // Enviar log
        const logData = await getLogChannel(message.guild, LOG_TYPES.MESSAGE_DELETE);
        if (!logData) return;
        if (isChannelIgnored(logData.config, message.channel.id)) return;

        const audit = await getAuditExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.DELETE)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.DELETED} Mensaje Eliminado`)
            .addFields(
                { name: `${DISCO_ICONS.USER} Autor`, value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: `${DISCO_ICONS.POINT} Canal`, value: `${message.channel}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `${DISCO_ICONS.MESSAGE} Contenido`, value: truncateText(message.content), inline: false }
            )
            .setFooter({ text: `ID: ${message.id}` })
            .setTimestamp();

        // Mostrar quién eliminó si es diferente al autor
        if (audit?.executor && audit.executor.id !== message.author.id) {
            embed.addFields({ name: `${DISCO_ICONS.ADMIN} Eliminado por`, value: `${audit.executor} (\`${audit.executor.tag}\`)`, inline: false });
        }

        // Adjuntos
        if (attachments.length > 0) {
            const attachmentList = attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: `${DISCO_ICONS.LINK} Archivos adjuntos`, value: attachmentList, inline: false });
        }

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
