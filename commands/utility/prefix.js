const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Shows the bot prefix for this server.'),

    async execute(interaction) {
        const currentPrefix = await getPrefix(interaction.guild.id);
        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} Prefix Information`)
            .setDescription(`${DISCO_ICONS.POINT} My prefix is \`${currentPrefix}\`\n${DISCO_ICONS.POINT} You can also use Slash Commands`)
            .setColor(0x2B2D31);
        await interaction.reply({ embeds: [embed] });
    },

    async messageRun(message, args) {
        const currentPrefix = await getPrefix(message.guild.id);
        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} Prefix Information`)
            .setDescription(`${DISCO_ICONS.POINT} My prefix is \`${currentPrefix}\`\n${DISCO_ICONS.POINT} You can also use Slash Commands`)
            .setColor(0x2B2D31);
        await message.reply({ embeds: [embed] });
    }
};
