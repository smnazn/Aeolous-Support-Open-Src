const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create a custom embed.')
        .addStringOption(option => option.setName('title').setDescription('Embed title').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Embed description').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('Hex color (e.g., #FF0000)').setRequired(false)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#2F3136';
        await this.handleEmbed(interaction, title, description, color);
    },
    async messageRun(message, args) {
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Create Embed`)
                .setDescription(`> **Usage:** \`.embed <title> | <description> | [color]\`\n> **Example:** \`.embed Hello | World | #FF0000\``)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        const parts = args.join(' ').split('|').map(p => p.trim());
        const title = parts[0] || 'Embed';
        const description = parts[1] || 'No description';
        const color = parts[2] || '#2F3136';
        await this.handleEmbed(message, title, description, color);
    },
    async handleEmbed(source, title, description, colorHex) {
        try {
            const color = parseInt(colorHex.replace('#', ''), 16);
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setFooter({ text: `Created by ${source.user ? source.user.tag : source.author.tag}` })
                .setTimestamp();

            if (source.reply) {
                await source.reply({ content: `${DISCO_ICONS.CHECKMARK} Embed created.`, ephemeral: true });
            }
            await source.channel.send({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Invalid color format**\n\n${DISCO_ICONS.POINT} Use hex format: \`#FF0000\``)
                .setColor(0x2B2D31);
            if (source.reply) await source.reply({ embeds: [embed] });
            else await source.channel.send({ embeds: [embed] });
        }
    }
};
