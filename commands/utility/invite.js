const { SlashCommandBuilder, EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),

    async execute(interaction) {
        await this.sendInvite(interaction);
    },

    async messageRun(message) {
        await this.sendInvite(message);
    },

    async sendInvite(source) {
        const client = source.client;

        const inviteLink = client.generateInvite({
            scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
            permissions: [
                PermissionFlagsBits.Administrator
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} Invite Aeolous Support`)
            .setDescription(`
${DISCO_ICONS.POINT} Click the button below to invite me to your server!

**[Click here to invite](${inviteLink})**

${DISCO_ICONS.POINT} **Required Permissions:** Administrator
${DISCO_ICONS.POINT} **Features:** Music, Moderation, Giveaways, Tickets, Logs
            `)
            .setColor(0x5865F2)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Thank you for using Aeolous Support!' });

        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed] });
    }
};
