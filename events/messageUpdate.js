const { Events, EmbedBuilder } = require('discord.js');
const {
    getLogChannel, isChannelIgnored, truncateText, LOG_COLORS, LOG_TYPES, DISCO_ICONS
} = require('../utils/serverLogs');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignorar bots y mensajes parciales
        if (newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;
        if (!oldMessage.content || !newMessage.content) return;

        const logData = await getLogChannel(newMessage.guild, LOG_TYPES.MESSAGE_EDIT);
        if (!logData) return;
        if (isChannelIgnored(logData.config, newMessage.channel.id)) return;

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS.UPDATE)
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .setTitle(`${DISCO_ICONS.EDIT} Mensaje Editado`)
            .addFields(
                { name: `${DISCO_ICONS.USER} Autor`, value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
                { name: `${DISCO_ICONS.POINT} Canal`, value: `${newMessage.channel}`, inline: true },
                { name: `${DISCO_ICONS.POINT} Antes`, value: truncateText(oldMessage.content), inline: false },
                { name: `${DISCO_ICONS.POINT} Después`, value: truncateText(newMessage.content), inline: false }
            )
            .setFooter({ text: `ID: ${newMessage.id}` })
            .setTimestamp();

        await logData.channel.send({ embeds: [embed] }).catch(() => { });
    }
};
