const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Display a user\'s banner.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get the banner from')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        await this.handleBanner(interaction, user);
    },
    async messageRun(message, args) {
        const user = message.mentions.users.first() || message.author;
        await this.handleBanner(message, user);
    },
    async handleBanner(source, user) {
        try {
            // Fetch user with banner
            const fetchedUser = await user.client.users.fetch(user.id, { force: true });

            const bannerURL = fetchedUser.bannerURL({ size: 4096, extension: 'png' });

            if (!bannerURL) {
                const embed = new EmbedBuilder()
                    .setDescription(`<:deny:1448831817963536506> **${user.tag}** doesn't have a banner set.`)
                    .setColor(0x2B2D31);

                if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
                else await source.channel.send({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.USER} ${user.tag}'s Banner`)
                .setImage(bannerURL)
                .setColor(fetchedUser.accentColor || 0x2B2D31)
                .setFooter({ text: `Requested by ${source.user ? source.user.tag : source.author.tag}` });

            if (source.reply) await source.reply({ embeds: [embed] });
            else await source.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching banner:', error);
            const embed = new EmbedBuilder()
                .setDescription(`<:deny:1448831817963536506> An error occurred while fetching the banner.`)
                .setColor(0x2B2D31);

            if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
            else await source.channel.send({ embeds: [embed] });
        }
    }
};









