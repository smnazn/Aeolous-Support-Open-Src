// In-memory storage for giveaways (use MongoDB GiveawayConfig model for persistence)
const giveawaysData = {};

function getGiveaways(guildId) {
    return giveawaysData[guildId] || { active: [], settings: { winMsg: 'Congratulations {user}! You won **{prize}**!', claimTime: 24 } };
}

function updateGiveaways(guildId, data) {
    giveawaysData[guildId] = data;
}

function addGiveaway(guildId, giveaway) {
    const data = getGiveaways(guildId);
    data.active.push(giveaway);
    updateGiveaways(guildId, data);
}

function endGiveaway(guildId, messageId) {
    const data = getGiveaways(guildId);
    const giveaway = data.active.find(g => g.messageId === messageId);
    if (giveaway) {
        giveaway.ended = true;
        updateGiveaways(guildId, data);
        return giveaway;
    }
    return null;
}

function getGiveaway(guildId, messageId) {
    const data = getGiveaways(guildId);
    return data.active.find(g => g.messageId === messageId);
}

module.exports = { getGiveaways, updateGiveaways, addGiveaway, endGiveaway, getGiveaway };
