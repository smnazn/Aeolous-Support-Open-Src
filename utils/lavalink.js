const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('./icons');

// Lavalink node configuration
const Nodes = [
    {
        name: 'Lavalink-Node',
        url: process.env.LAVALINK_HOST || 'localhost:2333',
        auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: false
    }
];

/**
 * Get Kazagumo instance from client
 * @param {Client} client - Discord.js client
 * @returns {Kazagumo} - Kazagumo instance
 */
function getKazagumo(client) {
    return client.kazagumo;
}

/**
 * Format duration in ms to readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create now playing embed
 * @param {Object} track - Kazagumo track
 * @param {Object} player - Kazagumo player
 * @returns {EmbedBuilder}
 */
function createNowPlayingEmbed(track, player) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(track.title || 'Unknown Track')
        .setURL(track.uri || null)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: `${DISCO_ICONS.POINT} Duración`, value: formatDuration(track.length), inline: true },
            { name: `${DISCO_ICONS.POINT} Autor`, value: track.author || 'Desconocido', inline: true }
        )
        .setFooter({ text: `Solicitado por ${track.requester?.tag || 'Desconocido'}` });

    return embed;
}

/**
 * Create music control buttons
 * @param {Object} player - Kazagumo player
 * @returns {ActionRowBuilder[]}
 */
function createMusicControls(player) {
    const rowMain = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_prev').setEmoji(DISCO_ICONS.ARROW_LEFT.match(/:(\d+)>/)[1]).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_pause_resume').setEmoji(player.paused ? DISCO_ICONS.PLAY.match(/:(\d+)>/)[1] : DISCO_ICONS.PAUSE.match(/:(\d+)>/)[1]).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_next').setEmoji(DISCO_ICONS.ARROW_RIGHT.match(/:(\d+)>/)[1]).setStyle(ButtonStyle.Secondary)
    );

    const rowExtra = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_loop').setEmoji(DISCO_ICONS.MUSIC_REPEAT.match(/:(\d+)>/)[1]).setStyle(player.loop === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_shuffle').setEmoji(DISCO_ICONS.SHUFFLE.match(/:(\d+)>/)[1]).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setEmoji(DISCO_ICONS.BLOCK.match(/:(\d+)>/)[1]).setStyle(ButtonStyle.Danger)
    );

    return [rowMain, rowExtra];
}

/**
 * Initialize Kazagumo (Lavalink client)
 * @param {Client} client - Discord.js client
 * @returns {Kazagumo} - Kazagumo instance
 */
function initializeLavalink(client) {
    const kazagumo = new Kazagumo({
        defaultSearchEngine: 'youtube',
        plugins: [
            new Plugins.PlayerMoved(client)
        ],
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), Nodes, {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 5,
        reconnectInterval: 5000,
        restTimeout: 60000
    });

    // Shoukaku events (connection level)
    kazagumo.shoukaku.on('ready', () => { });

    kazagumo.shoukaku.on('error', () => { });

    kazagumo.shoukaku.on('close', () => { });

    kazagumo.shoukaku.on('disconnect', () => { });

    kazagumo.shoukaku.on('reconnecting', () => { });

    // Kazagumo events (player level)
    kazagumo.on('playerStart', async (player, track) => {
        // Mark that this player has played at least one track
        player.data.set('hasPlayed', true);

        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        try {
            const embed = createNowPlayingEmbed(track, player);
            const controls = createMusicControls(player);

            const msg = await channel.send({
                embeds: [embed],
                components: controls
            });

            // Store message for later updates
            player.data.set('nowPlayingMessage', msg);
        } catch (err) {
            console.error('[Lavalink] Error sending now playing:', err.message);
        }
    });

    kazagumo.on('playerEnd', (player) => {
        // Track ended, Kazagumo will auto-play next if queue has tracks
    });

    kazagumo.on('playerEmpty', async (player) => {
        // Only show message if player has actually played something
        const hasPlayed = player.data.get('hasPlayed');
        if (!hasPlayed) return;

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            try {
                await channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setDescription(`${DISCO_ICONS.INFO} Cola vacía, desconectando...`)
                    ]
                });
            } catch { }
        }

        // Destroy player after queue is empty
        setTimeout(() => {
            if (!player.queue.current) {
                player.destroy();
            }
        }, 30000); // Wait 30 seconds before disconnecting
    });

    kazagumo.on('playerError', (player, error) => {
        console.error('[Lavalink] Player error:', error);
        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`${DISCO_ICONS.ERROR} Error reproduciendo pista, saltando...`)
                ]
            }).catch(() => { });
        }
        player.skip();
    });

    kazagumo.on('playerResolveError', (player, track, error) => {
        console.error('[Lavalink] Track resolve error:', error);
        player.skip();
    });

    return kazagumo;
}

module.exports = {
    initializeLavalink,
    getKazagumo,
    formatDuration,
    createNowPlayingEmbed,
    createMusicControls,
    Nodes
};
