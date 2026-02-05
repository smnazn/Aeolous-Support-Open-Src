const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getKazagumo } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

// Lavalink filter presets
const FILTER_PRESETS = {
    off: null,
    bassboost: {
        equalizer: [
            { band: 0, gain: 0.6 },
            { band: 1, gain: 0.7 },
            { band: 2, gain: 0.8 },
            { band: 3, gain: 0.55 },
            { band: 4, gain: 0.25 }
        ]
    },
    nightcore: {
        timescale: { speed: 1.3, pitch: 1.3, rate: 1 }
    },
    vaporwave: {
        timescale: { speed: 0.85, pitch: 0.9, rate: 1 },
        equalizer: [
            { band: 0, gain: 0.3 },
            { band: 1, gain: 0.3 }
        ]
    },
    karaoke: {
        karaoke: { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 }
    },
    tremolo: {
        tremolo: { frequency: 4, depth: 0.75 }
    },
    vibrato: {
        vibrato: { frequency: 4, depth: 0.75 }
    },
    '8d': {
        rotation: { rotationHz: 0.2 }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Aplica un filtro de audio')
        .addStringOption(opt => opt
            .setName('filter')
            .setDescription('Filtro a aplicar')
            .setRequired(true)
            .addChoices(
                { name: '🚫 Desactivar', value: 'off' },
                { name: '🔊 Bassboost', value: 'bassboost' },
                { name: '🌙 Nightcore', value: 'nightcore' },
                { name: '🌊 Vaporwave', value: 'vaporwave' },
                { name: '🎤 Karaoke', value: 'karaoke' },
                { name: '〰️ Tremolo', value: 'tremolo' },
                { name: '📳 Vibrato', value: 'vibrato' },
                { name: '🎧 8D Audio', value: '8d' }
            )
        ),

    async execute(interaction) {
        const filter = interaction.options.getString('filter');
        await this.handleFilter(interaction, filter);
    },

    async messageRun(message, args) {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${DISCO_ICONS.INFO} Filtros Disponibles`)
                .setDescription('`off` `bassboost` `nightcore` `vaporwave` `karaoke` `tremolo` `vibrato` `8d`\n\nUso: `.filter <nombre>`');
            return message.reply({ embeds: [embed] });
        }
        await this.handleFilter(message, args[0].toLowerCase());
    },

    async handleFilter(source, filterName) {
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

        const filterConfig = FILTER_PRESETS[filterName];
        if (filterConfig === undefined) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Filtro no válido. Usa: \`off\`, \`bassboost\`, \`nightcore\`, \`vaporwave\`, \`karaoke\`, \`tremolo\`, \`vibrato\`, \`8d\``);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        try {
            if (filterName === 'off') {
                // Clear all filters using Shoukaku's API
                await player.shoukaku.clearFilters();
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`${DISCO_ICONS.SUCCESS} Filtros desactivados`);
                return isInteraction
                    ? source.reply({ embeds: [embed] })
                    : source.reply({ embeds: [embed] });
            }

            // Apply filter using Shoukaku's API
            await player.shoukaku.setFilters(filterConfig);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`${DISCO_ICONS.SUCCESS} Filtro aplicado: **${filterName}**`);

            return isInteraction
                ? source.reply({ embeds: [embed] })
                : source.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[Filter] Error:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error aplicando filtro: ${error.message}`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }
    }
};
