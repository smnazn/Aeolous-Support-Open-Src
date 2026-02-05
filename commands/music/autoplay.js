const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Activa/desactiva el modo autoplay (canciones relacionadas)'),

    async execute(interaction) {
        await this.handleAutoplay(interaction);
    },

    async messageRun(message) {
        await this.handleAutoplay(message);
    },

    async handleAutoplay(source) {
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

        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} No hay música reproduciéndose`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // Toggle autoplay
        const currentAutoplay = player.data.get('autoplay') || false;
        player.data.set('autoplay', !currentAutoplay);

        const isEnabled = !currentAutoplay;
        const embed = new EmbedBuilder()
            .setColor(isEnabled ? '#00FF00' : '#FFA500')
            .setDescription(`🎲 Autoplay está ahora **${isEnabled ? 'activado' : 'desactivado'}**${isEnabled ? '\n\nAl terminar la cola, se añadirán canciones relacionadas automáticamente.' : ''}`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
