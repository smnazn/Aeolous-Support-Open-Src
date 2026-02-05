const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cmds')
        .setDescription('List all available commands.'),
    async execute(interaction) {
        await this.handleCmds(interaction);
    },
    async messageRun(message, args) {
        await this.handleCmds(message);
    },
    async handleCmds(source) {
        const client = source.client;
        const commands = client.commands;

        // Group commands by category
        const categories = {};
        commands.forEach(cmd => {
            if (!categories[cmd.category]) {
                categories[cmd.category] = [];
            }
            categories[cmd.category].push(cmd.data.name);
        });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: client.user.username,
                iconURL: client.user.displayAvatarURL()
            })
            .setTitle(`${DISCO_ICONS.COMMAND} **All Commands**`)
            .setDescription(
                Object.keys(categories).map(cat => {
                    const cmdList = categories[cat].map(cmd => `\`${cmd}\``).join(', ');
                    return `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**\n${cmdList}`;
                }).join('\n\n')
            )
            .setColor(0x2B2D31)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: `Total Commands: ${commands.size} | Prefix: ${process.env.BOT_PREFIX || '.'}` });

        if (source.reply) await source.reply({ embeds: [embed] });
        else await source.channel.send({ embeds: [embed] });
    }
};












