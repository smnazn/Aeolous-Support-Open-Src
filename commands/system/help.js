const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with commands.'),
    async execute(interaction) {
        await this.handleHelp(interaction);
    },
    async messageRun(message, args) {
        await this.handleHelp(message);
    },
    async handleHelp(source) {
        const client = source.client;
        const commands = client.commands;
        const categories = [...new Set(commands.map(cmd => cmd.category))];

        const select = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category')
            .addOptions(
                categories.map(cat =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat.charAt(0).toUpperCase() + cat.slice(1))
                        .setValue(cat)
                )
            );

        const row = new ActionRowBuilder().addComponents(select);

        const guild = source.guild;
        const botUser = client.user;

        // Get server-specific prefix
        const serverPrefix = await getPrefix(guild.id);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: botUser.username,
                iconURL: botUser.displayAvatarURL()
            })
            .setTitle(`${DISCO_ICONS.INFO} **Information**`)
            .setDescription(
                `**Prefix:** \`${serverPrefix}\`\n` +
                `**Servers:** ${client.guilds.cache.size}\n` +
                `**Users:** ${client.users.cache.size.toLocaleString()}\n\n` +
                `**Links**\n` +
                `[Invite Bot](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands) • [Support Server](https://discord.gg/aeolous)\n` +
                `Use \`.invite\` for invite link\n\n` +
                `Select a category from the dropdown menu below`
            )
            .setColor(0x2B2D31)
            .setThumbnail(botUser.displayAvatarURL());

        let response;
        if (source.reply) {
            response = await source.reply({ embeds: [embed], components: [row], fetchReply: true });
        } else {
            response = await source.channel.send({ embeds: [embed], components: [row] });
        }

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

        collector.on('collect', async i => {
            if (i.user.id !== (source.user ? source.user.id : source.author.id)) {
                return i.reply({ content: 'This menu is not for you.', ephemeral: true });
            }

            const selection = i.values[0];
            const categoryCommands = commands.filter(cmd => cmd.category === selection);

            const categoryEmbed = new EmbedBuilder()
                .setAuthor({
                    name: botUser.username,
                    iconURL: botUser.displayAvatarURL()
                })
                .setTitle(`**${selection.charAt(0).toUpperCase() + selection.slice(1)} Commands**`)
                .setDescription(
                    categoryCommands.map(cmd =>
                        `${DISCO_ICONS.POINT} **${cmd.data.name}** - ${cmd.data.description}`
                    ).join('\n')
                )
                .setColor(0x2B2D31)
                .setThumbnail(botUser.displayAvatarURL());

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            row.components[0].setDisabled(true);
            response.edit({ components: [row] }).catch(() => { });
        });
    }
};












