// In-memory storage for antiraid settings (use MongoDB for persistence if needed)
const antiraidData = {};

function getSettings(guildId) {
    return antiraidData[guildId] || { enabled: false, logChannel: null, whitelist: [] };
}

function updateSettings(guildId, settings) {
    antiraidData[guildId] = { ...getSettings(guildId), ...settings };
    return antiraidData[guildId];
}

function addToWhitelist(guildId, userId) {
    const settings = getSettings(guildId);
    if (!settings.whitelist.includes(userId)) {
        settings.whitelist.push(userId);
        updateSettings(guildId, { whitelist: settings.whitelist });
        return true;
    }
    return false;
}

function removeFromWhitelist(guildId, userId) {
    const settings = getSettings(guildId);
    if (settings.whitelist.includes(userId)) {
        settings.whitelist = settings.whitelist.filter(id => id !== userId);
        updateSettings(guildId, { whitelist: settings.whitelist });
        return true;
    }
    return false;
}

module.exports = { getSettings, updateSettings, addToWhitelist, removeFromWhitelist };
