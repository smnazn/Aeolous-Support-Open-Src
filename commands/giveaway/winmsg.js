const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGiveaways, updateGiveaways } = require('../../utils/giveaways');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('winmsg')
        .setDescription('Set giveaway winner message.')
        .addStringOption(option => option.setName('message').setDescription('Message (use {user} and {prize})').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    async execute(interaction) {
        const message = interaction.options.getString('message');
        await this.handleWinmsg(interaction, message);
    },
    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) return message.reply(`${DISCO_ICONS.ERROR} You do not have permission to manage events.`);
        if (args.length === 0) {
            const prefix = await getPrefix(message.guild.id);
            return message.reply(`${DISCO_ICONS.WARNING} Usage: ${prefix}winmsg <message>`);
        }
        const msg = args.join(' ');
        await this.handleWinmsg(message, msg);
    },
    async handleWinmsg(source, message) {
        const data = getGiveaways(source.guild.id);
        data.settings.winMsg = message;
        updateGiveaways(source.guild.id, data);

        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply(`${DISCO_ICONS.CHECKMARK} Winner message updated: ${message}`);
    }
};











