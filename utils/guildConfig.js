const GuildConfig = require('../models/GuildConfig');

// Cache to reduce DB calls
const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get guild configuration
 * @param {string} guildId 
 * @returns {Promise<Object>}
 */
async function getGuildConfig(guildId) {
    // Check cache first
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        config = new GuildConfig({ guildId });
        await config.save();
    }

    // Update cache
    configCache.set(guildId, { data: config, timestamp: Date.now() });
    return config;
}

/**
 * Set a config value for a guild
 * @param {string} guildId 
 * @param {string} key 
 * @param {any} value 
 */
async function setGuildConfig(guildId, key, value) {
    const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { [key]: value },
        { upsert: true, new: true }
    );

    // Invalidate cache
    configCache.delete(guildId);
    return config;
}

/**
 * Get staff role ID for a guild
 */
async function getStaffRole(guildId) {
    const config = await getGuildConfig(guildId);
    return config.staffRoleId;
}

/**
 * Get partners role ID for a guild
 */
async function getPartnersRole(guildId) {
    const config = await getGuildConfig(guildId);
    return config.partnersRoleId;
}

/**
 * Get partners channel ID for a guild
 */
async function getPartnersChannel(guildId) {
    const config = await getGuildConfig(guildId);
    return config.partnersChannelId;
}

/**
 * Get prefix for a guild
 */
async function getPrefix(guildId) {
    const config = await getGuildConfig(guildId);
    return config.prefix || '.';
}

module.exports = {
    getGuildConfig,
    setGuildConfig,
    getStaffRole,
    getPartnersRole,
    getPartnersChannel,
    getPrefix
};
