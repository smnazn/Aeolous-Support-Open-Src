const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Configura el modo de repetición')
        .addStringOption(opt => opt
            .setName('mode')
            .setDescription('Modo de loop')
            .setRequired(false)
            .addChoices(
                { name: '🚫 Desactivar', value: 'none' },
                { name: '🔂 Canción', value: 'track' },
                { name: '🔁 Cola', value: 'queue' }
            )
        ),

    async execute(interaction) {
        const mode = interaction.options.getString('mode');
        await this.handleLoop(interaction, mode);
    },

    async messageRun(message, args) {
        const mode = args[0]?.toLowerCase() || null;
        await this.handleLoop(message, mode);
    },

    async handleLoop(source, mode) {
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

        // If no mode specified, cycle through modes
        if (!mode) {
            const currentLoop = player.loop;
            if (currentLoop === 'none') mode = 'track';
            else if (currentLoop === 'track') mode = 'queue';
            else mode = 'none';
        }

        // Map mode names
        const modeMap = {
            'none': 'none',
            'off': 'none',
            'track': 'track',
            'song': 'track',
            'cancion': 'track',
            'queue': 'queue',
            'cola': 'queue',
            'all': 'queue'
        };

        const actualMode = modeMap[mode] || 'none';
        player.setLoop(actualMode);

        const modeNames = {
            'none': '🚫 Desactivado',
            'track': '🔂 Canción',
            'queue': '🔁 Cola'
        };

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`${DISCO_ICONS.SUCCESS} Loop: **${modeNames[actualMode]}**`);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
