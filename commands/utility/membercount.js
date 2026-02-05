const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('View server member statistics.'),
    async execute(interaction) {
        await interaction.deferReply();
        await interaction.guild.members.fetch();

        const totalMembers = interaction.guild.memberCount;
        const onlineMembers = interaction.guild.members.cache.filter(member => member.presence?.status !== 'offline' && member.presence?.status).size;
        const bots = interaction.guild.members.cache.filter(member => member.user.bot).size;
        const humans = totalMembers - bots;

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} ${interaction.guild.name}`)
            .addFields(
                { name: '<a:15136blackdot:1448143887699804252> Total Members', value: `${totalMembers}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Online Members', value: `${onlineMembers}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Humans', value: `${humans}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Bots', value: `${bots}`, inline: false }
            )
            .setColor(0x2B2D31)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }));
        await interaction.editReply({ embeds: [embed] });
    },
    async messageRun(message, args) {
        await message.guild.members.fetch();

        const totalMembers = message.guild.memberCount;
        const onlineMembers = message.guild.members.cache.filter(member => member.presence?.status !== 'offline' && member.presence?.status).size;
        const bots = message.guild.members.cache.filter(member => member.user.bot).size;
        const humans = totalMembers - bots;

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} ${message.guild.name}`)
            .addFields(
                { name: '<a:15136blackdot:1448143887699804252> Total Members', value: `${totalMembers}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Online Members', value: `${onlineMembers}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Humans', value: `${humans}`, inline: false },
                { name: '<a:15136blackdot:1448143887699804252> Bots', value: `${bots}`, inline: false }
            )
            .setColor(0x2B2D31)
            .setThumbnail(message.guild.iconURL({ dynamic: true }));
        await message.reply({ embeds: [embed] });
    }
};












