let playerInstance;

if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}

try {
    process.env.FFMPEG_PATH = require('ffmpeg-static');
} catch { }
const { Player, BaseExtractor, QueryType, Track, Util, onBeforeCreateStream } = require('discord-player');
const playdl = require('play-dl');
const youtubeDl = require('youtube-dl-exec');
const os = require('os');
const debug = (msg, data) => { }; // console.log(`[Player Debug] ${msg}`, data || '');

class PlayDlYoutubeExtractor extends BaseExtractor {
    static identifier = 'com.discord-player.playdl-ytextractor';

    async validate(query, type) {
        if (typeof query !== 'string') return false;
        try {
            const kind = await playdl.validate(query);
            return kind === 'yt_video';
        } catch {
            return false;
        }
    }

    async handle(query, context) {
        if (typeof query !== 'string') return this.createResponse(null, []);
        try {
            const kind = await playdl.validate(query);
            if (kind !== 'yt_video') return this.createResponse(null, []);
            const info = await playdl.video_basic_info(query);
            const vid = info?.video_details;
            if (!vid) return this.createResponse(null, []);
            const durationMs = (vid.durationInSec || 0) * 1000;
            const track = new Track(this.context.player, {
                title: vid.title || query,
                url: vid.url || query,
                duration: Util.buildTimeCode(Util.parseMS(durationMs)),
                description: vid.description || '',
                thumbnail: (vid.thumbnails && vid.thumbnails.length ? vid.thumbnails[0].url : '') || '',
                views: vid.views || 0,
                author: (vid.channel && vid.channel.name) || 'YouTube',
                requestedBy: context.requestedBy || null,
                source: 'youtube',
                engine: info,
                queryType: context.type || QueryType.YOUTUBE_VIDEO,
                metadata: info,
                requestMetadata: async () => info,
                cleanTitle: vid.title || query,
            });
            track.extractor = this;
            track.playdlUrl = vid.url || query;
            return this.createResponse(null, [track]);
        } catch {
            return this.createResponse(null, []);
        }
    }

    async getRelatedTracks(track, history) {
        return this.createResponse(null, []);
    }

    async stream(info) {
        try {
            // Extract URL from track info
            let url = null;
            if (info && typeof info.playdlUrl === 'string' && info.playdlUrl.startsWith('http')) {
                url = info.playdlUrl;
            } else if (info && typeof info.url === 'string' && info.url.startsWith('http')) {
                url = info.url;
            } else if (info && info.metadata && info.metadata.video_details && typeof info.metadata.video_details.url === 'string') {
                url = info.metadata.video_details.url;
            }

            debug('PlayDlYoutubeExtractor.stream start', { url, hasMeta: !!(info && info.metadata) });

            if (!url || !url.includes('youtube') && !url.includes('youtu.be')) {
                console.error('PlayDlYoutubeExtractor.stream: not a valid YouTube URL:', url);
                return null;
            }

            const ytStream = await playdl.stream(url, { discordPlayerCompatibility: true });
            const result = ytStream && (ytStream.stream || ytStream);
            debug('PlayDlYoutubeExtractor.stream success', { hasStream: !!result });
            return result || null;
        } catch (e) {
            console.error('PlayDlYoutubeExtractor.stream error', e && (e.message || e));
            return null;
        }
    }
}

function getPlayer(client) {
    if (!playerInstance) {
        playerInstance = new Player(client, { skipFFmpeg: false, ytdlOptions: { highWaterMark: 1 << 29 } });

        try {
            onBeforeCreateStream(async (track, queryType, queue) => {
                try {
                    const s0 = (track.source || '').toString().toLowerCase();
                    const s1 = (queryType || '').toString().toLowerCase();
                    if (!s0.includes('youtube') && !s1.includes('youtube')) return null;

                    const rawUrl = track.playdlUrl || track.url;
                    if (!rawUrl || typeof rawUrl !== 'string') return null;

                    // Ensure valid YouTube URL
                    let url = rawUrl;
                    if (!rawUrl.startsWith('http')) {
                        url = `https://www.youtube.com/watch?v=${rawUrl}`;
                    }

                    if (!url.includes('youtube') && !url.includes('youtu.be')) {
                        console.error('onBeforeCreateStream: not a YouTube URL:', url);
                        return null;
                    }

                    // Use play-dl for streaming
                    const ytStream = await playdl.stream(url, { discordPlayerCompatibility: true });
                    return ytStream?.stream || ytStream || null;
                } catch (e) {
                    console.error('onBeforeCreateStream play-dl error', e?.message || e);
                    return null;
                }
            });
        } catch { }

        try {
            const extractorPkg = require('@discord-player/extractor');
            if (extractorPkg.DefaultExtractors) {
                try {
                    const extractors = extractorPkg.DefaultExtractors;
                    debug('loading extractors', extractors.map(ex => ex.identifier || ex.id || 'unknown'));
                    playerInstance.extractors.loadMulti(extractors).catch(() => { });
                } catch {
                    playerInstance.extractors.loadMulti(extractorPkg.DefaultExtractors).catch(() => { });
                }

                if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && extractorPkg.SpotifyExtractor) {
                    try {
                        playerInstance.extractors.register(extractorPkg.SpotifyExtractor, {
                            clientId: process.env.SPOTIFY_CLIENT_ID,
                            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                        });
                        debug('Spotify extractor registered');
                    } catch { }
                }
            }

            playerInstance.extractors.register(PlayDlYoutubeExtractor, {}).then(() => {
                debug('PlayDlYoutubeExtractor registered');
            }).catch(() => { });

            if (!playerInstance._debugSet) {
                playerInstance.events.on('playerStart', async (queue, track) => {
                    if (queue._wasSkipped) {
                        queue._skipLock = false;
                        queue._wasSkipped = false;
                        return;
                    }
                    const ch = queue?.metadata?.channel;
                    if (!ch) return;
                    try {
                        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                        const { QueueRepeatMode } = require('discord-player');
                        const embed = new EmbedBuilder()
                            .setTitle(track.title)
                            .setURL(track.url)
                            .setDescription(track.description || '\u200B')
                            .setThumbnail(track.thumbnail)
                            .addFields({ name: 'Duración', value: track.duration, inline: true }, { name: 'Fuente', value: track.source || 'desconocida', inline: true });
                        const rowMain = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('music_prev').setEmoji('<:emoji_6:1383268974690566316>').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_pause_resume').setEmoji('<:emoji_3:1382561683859312661>').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_next').setEmoji('<:emoji_7:1383268990003974164>').setStyle(ButtonStyle.Secondary)
                        );
                        const rowExtra = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('music_loop').setEmoji('<:emoji_9:1383273442043887676>').setStyle(queue.repeatMode === 1 ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_autoplay').setLabel('AUTO').setStyle(queue.repeatMode === QueueRepeatMode.AUTOPLAY ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_like').setEmoji('<:emoji_8:1383272745500147742>').setStyle(ButtonStyle.Secondary)
                        );
                        let msg;
                        if (queue._lastMessage) {
                            try {
                                await queue._lastMessage.edit({ embeds: [embed], components: [rowMain, rowExtra] });
                                msg = queue._lastMessage;
                            } catch {
                                msg = await ch.send({ embeds: [embed], components: [rowMain, rowExtra] });
                            }
                        } else {
                            msg = await ch.send({ embeds: [embed], components: [rowMain, rowExtra] });
                        }
                        queue._lastMessage = msg;
                    } catch { }
                });
                playerInstance._debugSet = true;
            }

            if (!playerInstance._autoLogSet) {
                playerInstance.events.on('willAutoPlay', (queue, tracks, done) => {
                    done(tracks[0] || null);
                });
                playerInstance._autoLogSet = true;
            }

            const { QueueRepeatMode: QR } = require('discord-player');
            playerInstance.events.on('playerError', async (queue, error, track) => {
                console.error('[Music] playerError:', error?.message || error);
                if (queue.repeatMode === QR.AUTOPLAY || queue._autoplay) {
                    try {
                        queue._wasSkipped = true;
                        await queue.node.skip();
                    } catch { }
                }
            });

            playerInstance.events.on('error', (queue, error) => {
                console.error('[Music] Queue error:', error?.message || error);
            });

            playerInstance.events.on('connectionError', (queue, error) => {
                console.error('[Music] Connection error:', error?.message || error);
            });

        } catch { }
    }
    return playerInstance;
}

module.exports = { getPlayer };



