const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo, formatDuration } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de reproducción'),

    async execute(interaction) {
        await this.handleQueue(interaction);
    },

    async messageRun(message) {
        await this.handleQueue(message);
    },

    async handleQueue(source) {
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

        const current = player.queue.current;
        const queue = player.queue;

        let description = `**${DISCO_ICONS.POINT} Reproduciendo:**\n[${current.title}](${current.uri}) - \`${formatDuration(current.length)}\`\n\n`;

        if (queue.size === 0) {
            description += `**${DISCO_ICONS.POINT} Siguiente:**\nNo hay más canciones en la cola.`;
        } else {
            description += `**${DISCO_ICONS.POINT} Siguiente:**\n`;
            const tracks = [...queue].slice(0, 10);
            description += tracks.map((track, i) =>
                `${i + 1}. [${track.title}](${track.uri}) - \`${formatDuration(track.length)}\``
            ).join('\n');

            if (queue.size > 10) {
                description += `\n\n... y ${queue.size - 10} canciones más.`;
            }
        }

        const loopMode = player.loop === 'track' ? 'Canción' : player.loop === 'queue' ? 'Cola' : 'Desactivado';

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${DISCO_ICONS.TOP} Cola de Música`)
            .setDescription(description)
            .setThumbnail(current.thumbnail)
            .setFooter({ text: `${queue.size} canciones en cola | Loop: ${loopMode}` });

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
