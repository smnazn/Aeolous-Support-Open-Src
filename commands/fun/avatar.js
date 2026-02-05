const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get user avatar.')
        .addUserOption(option => option.setName('target').setDescription('The user').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        await this.handleAvatar(interaction, user);
    },
    async messageRun(message, args) {
        const user = message.mentions.users.first() || message.author;
        await this.handleAvatar(message, user);
    },
    async handleAvatar(source, user) {
        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} ${user.tag}'s Avatar`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor(0x2B2D31);

        if (source.reply) await source.reply({ embeds: [embed] });
        else await source.channel.send({ embeds: [embed] });
    }
};
