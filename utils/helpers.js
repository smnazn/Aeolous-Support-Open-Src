const { EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('./icons');

const COLORS = {
    DEFAULT: 0x2B2D31,
    ERROR: 0xED4245,
    SUCCESS: 0x57F287,
    WARNING: 0xFEE75C
};

// Use new DiscoTools icons
const ICONS = {
    LOADING: DISCO_ICONS.LOADING,
    POINT: DISCO_ICONS.POINT,
    SUCCESS: DISCO_ICONS.SUCCESS,
    CHECKMARK: DISCO_ICONS.CHECKMARK,
    ERROR: DISCO_ICONS.ERROR,
    CROSSMARK: DISCO_ICONS.CROSSMARK,
    WARNING: DISCO_ICONS.WARNING,
    INFO: DISCO_ICONS.INFO,
    // Extra useful icons
    CROWN: DISCO_ICONS.CROWN,
    STAR: DISCO_ICONS.STAR,
    GIFT: DISCO_ICONS.GIFT,
    LOCK: DISCO_ICONS.LOCK,
    USER: DISCO_ICONS.USER,
    FIRE: DISCO_ICONS.FIRE,
    HEART: DISCO_ICONS.HEART,
    LIGHTNING: DISCO_ICONS.LIGHTNING,
    SEARCH: DISCO_ICONS.SEARCH,
    WRENCH: DISCO_ICONS.WRENCH,
    CHECK: DISCO_ICONS.CHECK,
    CROSS: DISCO_ICONS.CROSS,
    ARROW: DISCO_ICONS.ARROW,
    DIAMOND: DISCO_ICONS.DIAMOND,
    SHIELD: DISCO_ICONS.SHIELD,
    KEY: DISCO_ICONS.KEY,
    TAG: DISCO_ICONS.TAG,
    DOLLAR: DISCO_ICONS.DOLLAR
};

/**
 * Creates a standard error embed
 * @param {string} description - The error message
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(description) {
    return new EmbedBuilder()
        .setDescription(`${ICONS.CROSSMARK} **Error:** ${description}`)
        .setColor(COLORS.DEFAULT);
}

/**
 * Creates a standard success embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description/content
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`${ICONS.SUCCESS} ${title}`)
        .setDescription(description)
        .setColor(COLORS.DEFAULT);
}

/**
 * Parses time string to milliseconds
 * @param {string} timeStr - Time string (e.g., '1h', '30m', '1d')
 * @returns {number|null} Time in milliseconds or null if invalid
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

module.exports = {
    COLORS,
    ICONS,
    createErrorEmbed,
    createSuccessEmbed,
    parseTime,
    DISCO_ICONS
};



