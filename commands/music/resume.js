const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reanuda la reproducción de música'),

    async execute(interaction) {
        await this.handleResume(interaction);
    },

    async messageRun(message) {
        await this.handleResume(message);
    },

    async handleResume(source) {
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

        if (!player.paused) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} La música ya se está reproduciendo`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        player.pause(false);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`${DISCO_ICONS.SUCCESS} ▶️ Música reanudada`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
