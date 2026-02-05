const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajusta el volumen de la música')
        .addIntegerOption(opt => opt
            .setName('percent')
            .setDescription('Volumen (0-150)')
            .setMinValue(0)
            .setMaxValue(150)
            .setRequired(true)
        ),

    async execute(interaction) {
        const volume = interaction.options.getInteger('percent');
        await this.handleVolume(interaction, volume);
    },

    async messageRun(message, args) {
        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 150) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} Usa: \`.volume <0-150>\``);
            return message.reply({ embeds: [embed] });
        }
        await this.handleVolume(message, volume);
    },

    async handleVolume(source, volume) {
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

        player.setVolume(volume);

        const volumeIcon = volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`${volumeIcon} Volumen ajustado a **${volume}%**`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
