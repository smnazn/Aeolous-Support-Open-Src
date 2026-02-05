const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta la canción actual'),

    async execute(interaction) {
        await this.handleSkip(interaction);
    },

    async messageRun(message) {
        await this.handleSkip(message);
    },

    async handleSkip(source) {
        const isInteraction = !!source.deferReply;
        const guild = source.guild;
        const member = source.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.WARNING} Debes estar en un canal de voz`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        const kazagumo = getKazagumo(source.client);
        const player = kazagumo?.players.get(guild.id);

        if (!player || !player.queue.current) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} No hay música reproduciéndose`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        const skippedTrack = player.queue.current;
        player.skip();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`${DISCO_ICONS.SUCCESS} Saltado: **${skippedTrack.title}**`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
