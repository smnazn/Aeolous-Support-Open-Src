const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa la reproducción de música'),

    async execute(interaction) {
        await this.handlePause(interaction);
    },

    async messageRun(message) {
        await this.handlePause(message);
    },

    async handlePause(source) {
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

        if (player.paused) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} La música ya está pausada. Usa \`/resume\``);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        player.pause(true);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`${DISCO_ICONS.SUCCESS} ⏸️ Música pausada`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
