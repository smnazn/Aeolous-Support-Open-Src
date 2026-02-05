const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getLogChannel } = require('../../utils/serverLogs');

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|io|gg|xyz|co|me|dev|app|tv|info|biz)[^\s]*)/gi;

function sanitizeMessage(text) {
    // Remove @everyone and @here
    let sanitized = text.replace(/@everyone/gi, '`@everyone`');
    sanitized = sanitized.replace(/@here/gi, '`@here`');

    // Remove links
    sanitized = sanitized.replace(URL_REGEX, '[link removed]');

    return sanitized;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repite tu mensaje.')
        .addStringOption(option => option.setName('message').setDescription('Mensaje a enviar').setRequired(true)),

    async execute(interaction) {
        let message = interaction.options.getString('message');
        message = sanitizeMessage(message);

        await interaction.reply({ content: `${DISCO_ICONS.CHECKMARK} Mensaje enviado.`, flags: 64 });
        await interaction.channel.send({ content: message, allowedMentions: { parse: [] } });

        // Log the say command usage
        const logData = await getLogChannel(interaction.guild, 'logMessageDelete');
        if (logData) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.MESSAGE} Say Command Used`)
                .setDescription(
                    `${DISCO_ICONS.MEMBER} **User:** ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
                    `${DISCO_ICONS.CHANNEL} **Channel:** <#${interaction.channel.id}>\n` +
                    `${DISCO_ICONS.INFO} **Message:**\n\`\`\`${message.substring(0, 1000)}\`\`\``
                )
                .setColor('#FFA500')
                .setTimestamp();
            await logData.channel.send({ embeds: [embed] }).catch(() => { });
        }
    },

    async messageRun(message, args) {
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Say Command`)
                .setDescription('> **Uso:** `.say <mensaje>`')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        let msg = args.join(' ');
        msg = sanitizeMessage(msg);

        try {
            await message.delete();
        } catch (e) { }

        await message.channel.send({ content: msg, allowedMentions: { parse: [] } });

        // Log the say command usage
        const logData = await getLogChannel(message.guild, 'logMessageDelete');
        if (logData) {
            const logEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.MESSAGE} Say Command Used`)
                .setDescription(
                    `${DISCO_ICONS.MEMBER} **User:** ${message.author.tag} (<@${message.author.id}>)\n` +
                    `${DISCO_ICONS.CHANNEL} **Channel:** <#${message.channel.id}>\n` +
                    `${DISCO_ICONS.INFO} **Message:**\n\`\`\`${msg.substring(0, 1000)}\`\`\``
                )
                .setColor('#FFA500')
                .setTimestamp();
            await logData.channel.send({ embeds: [logEmbed] }).catch(() => { });
        }
    }
};












