const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getKazagumo, formatDuration, createNowPlayingEmbed, createMusicControls } = require('../../utils/lavalink');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce música en el canal de voz')
        .addStringOption(opt => opt
            .setName('query')
            .setDescription('Canción, URL de YouTube, Spotify o búsqueda')
            .setRequired(false)
            .setAutocomplete(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        await this.handlePlay(interaction, query);
    },

    async messageRun(message, args) {
        const query = args.join(' ');
        await this.handlePlay(message, query);
    },

    async handlePlay(source, query) {
        const isInteraction = !!source.deferReply;
        const member = source.member;
        const guild = source.guild;
        const channel = source.channel;
        const voiceChannel = member.voice.channel;

        // Check if user is in voice channel
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.WARNING} Debes estar en un canal de voz`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // Get Kazagumo
        const kazagumo = getKazagumo(source.client);
        if (!kazagumo) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Sistema de música no disponible`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // Check if Lavalink nodes are online
        const nodes = kazagumo.shoukaku.nodes;
        const onlineNodes = [...nodes.values()].filter(n => n.state === 1); // state 1 = connected
        if (onlineNodes.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} El servidor de música se está conectando. Intenta de nuevo en unos segundos.`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // Get existing player
        let player = kazagumo.players.get(guild.id);

        // Check if bot is in different channel
        if (player && player.voiceId && player.voiceId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} El bot ya está en <#${player.voiceId}>. Únete a ese canal.`);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // If no query and player exists, resume or show now playing
        if (!query) {
            if (player && player.queue.current) {
                if (player.paused) {
                    player.pause(false);
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setDescription(`${DISCO_ICONS.SUCCESS} Reproducción reanudada`);
                    return isInteraction ? source.reply({ embeds: [embed] }) : source.reply({ embeds: [embed] });
                }

                // Show now playing
                const track = player.queue.current;
                const embed = createNowPlayingEmbed(track, player);
                const controls = createMusicControls(player);
                return isInteraction
                    ? source.reply({ embeds: [embed], components: controls })
                    : source.reply({ embeds: [embed], components: controls });
            }

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} Uso: \`/play <canción o URL>\``);
            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        // Defer reply for search
        if (isInteraction) await source.deferReply();

        try {
            // Determine search type based on query
            let searchQuery = query;
            let searchEngine = 'youtube'; // default engine

            // Detect if query is a URL
            if (query.startsWith('http')) {
                searchQuery = query; // Use URL directly
            } else if (query.toLowerCase().includes('spotify') || query.startsWith('spotify:')) {
                searchEngine = 'spotify';
            }

            // Search for track using Kazagumo's default search engine
            let result = await kazagumo.search(searchQuery, {
                requester: isInteraction ? source.user : source.author,
                engine: searchEngine
            });

            // If no results, try with different engines
            if (!result.tracks || result.tracks.length === 0) {
                // Try Spotify if not already tried
                if (searchEngine !== 'spotify') {
                    result = await kazagumo.search(searchQuery, {
                        requester: isInteraction ? source.user : source.author,
                        engine: 'spotify'
                    });
                }
            }

            // If still no results, try SoundCloud
            if (!result.tracks || result.tracks.length === 0) {
                result = await kazagumo.search(searchQuery, {
                    requester: isInteraction ? source.user : source.author,
                    engine: 'soundcloud'
                });
            }

            if (!result.tracks || result.tracks.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`${DISCO_ICONS.ERROR} No se encontraron resultados para: **${query}**`);
                return isInteraction
                    ? source.editReply({ embeds: [embed] })
                    : source.reply({ embeds: [embed] });
            }

            // Create or get player
            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: guild.id,
                    textId: channel.id,
                    voiceId: voiceChannel.id,
                    volume: 80,
                    deaf: true
                });
            }

            // Add tracks to queue
            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    player.queue.add(track);
                }

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`${DISCO_ICONS.SUCCESS} Playlist añadida: **${result.playlistName}**\n${DISCO_ICONS.POINT} ${result.tracks.length} canciones`)
                    .setThumbnail(result.tracks[0]?.thumbnail || null);

                if (isInteraction) await source.editReply({ embeds: [embed] });
                else await source.reply({ embeds: [embed] });
            } else {
                const track = result.tracks[0];
                player.queue.add(track);

                // If already playing, show "added to queue"
                if (player.playing || player.paused) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle(`${DISCO_ICONS.SUCCESS} Añadido a la cola`)
                        .setDescription(`**${track.title}**`)
                        .setThumbnail(track.thumbnail)
                        .addFields(
                            { name: `${DISCO_ICONS.POINT} Duración`, value: formatDuration(track.length), inline: true },
                            { name: `${DISCO_ICONS.POINT} Autor`, value: track.author || 'Desconocido', inline: true },
                            { name: `${DISCO_ICONS.POINT} Posición`, value: `#${player.queue.size}`, inline: true }
                        )
                        .setFooter({ text: `Solicitado por ${track.requester?.tag || 'Desconocido'}` });

                    if (isInteraction) await source.editReply({ embeds: [embed] });
                    else await source.reply({ embeds: [embed] });
                } else {
                    // Will be handled by playerStart event
                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setDescription(`${DISCO_ICONS.REMINDER} Cargando **${track.title}**...`);

                    if (isInteraction) await source.editReply({ embeds: [embed] });
                    else await source.reply({ embeds: [embed] });
                }
            }

            // Start playing if not already
            if (!player.playing && !player.paused) {
                await player.play();
            }

        } catch (error) {
            console.error('[Play] Error:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error al reproducir: ${error.message}`);

            if (isInteraction) {
                if (source.deferred) return source.editReply({ embeds: [embed] });
                return source.reply({ embeds: [embed], ephemeral: true });
            }
            return source.reply({ embeds: [embed] });
        }
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        if (!focused || focused.length < 3) {
            return interaction.respond([]);
        }

        try {
            const kazagumo = getKazagumo(interaction.client);
            if (!kazagumo) return interaction.respond([]);

            const result = await kazagumo.search(`ytsearch:${focused}`, {
                requester: interaction.user
            });

            const choices = result.tracks.slice(0, 10).map(track => ({
                name: `${track.title} - ${track.author}`.substring(0, 100),
                value: track.uri
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    }
};
