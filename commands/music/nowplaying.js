const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo, formatDuration, createNowPlayingEmbed, createMusicControls } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra la canción actual'),

    async execute(interaction) {
        await this.handleNowPlaying(interaction);
    },

    async messageRun(message) {
        await this.handleNowPlaying(message);
    },

    async handleNowPlaying(source) {
        const isInteraction = !!source.deferReply;
        const guild = source.guild;

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

        const track = player.queue.current;
        const position = player.position;
        const duration = track.length;

        // Create progress bar
        const progressBar = createProgressBar(position, duration);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🎵 ${track.title}`)
            .setURL(track.uri)
            .setThumbnail(track.thumbnail)
            .setDescription(`${progressBar}\n\`${formatDuration(position)} / ${formatDuration(duration)}\``)
            .addFields(
                { name: `${DISCO_ICONS.POINT} Autor`, value: track.author || 'Desconocido', inline: true },
                { name: `${DISCO_ICONS.POINT} Volumen`, value: `${player.volume}%`, inline: true },
                { name: `${DISCO_ICONS.POINT} Loop`, value: player.loop === 'track' ? 'Canción' : player.loop === 'queue' ? 'Cola' : 'Desactivado', inline: true }
            )
            .setFooter({ text: `Solicitado por ${track.requester?.tag || 'Desconocido'}` });

        const controls = createMusicControls(player);

        return isInteraction
            ? source.reply({ embeds: [embed], components: controls })
            : source.reply({ embeds: [embed], components: controls });
    }
};

function createProgressBar(current, total, length = 15) {
    if (!total || total === 0) return '▬'.repeat(length);

    const progress = Math.min(current / total, 1);
    const filled = Math.round(length * progress);
    const empty = length - filled;

    return '▰'.repeat(filled) + '▱'.repeat(empty);
}
