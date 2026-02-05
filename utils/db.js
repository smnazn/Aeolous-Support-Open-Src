const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || process.env.MONGOD_URI;

if (!uri) {
    throw new Error('MONGODB_URI no está definida en las variables de entorno (.env)');
}

const client = new MongoClient(uri);

let collection;

async function getCollection() {
    if (!collection) {
        await client.connect();
        const db = client.db('autorole');
        collection = db.collection('configs');
    }
    return collection;
}

async function getNukeCollection() {
    await client.connect();
    const db = client.db('nuke');
    return db.collection('configs');
}

async function getPlaylistsCollection() {
    await client.connect();
    const db = client.db('music');
    return db.collection('playlists');
}

async function getInviteStatsCollection() {
    await client.connect();
    const db = client.db('invites');
    return db.collection('stats');
}

async function getMemberInvitersCollection() {
    await client.connect();
    const db = client.db('invites');
    return db.collection('members');
}

async function getLeftMembersCollection() {
    await client.connect();
    const db = client.db('invites');
    return db.collection('left');
}

async function getWarnsCollection() {
    await client.connect();
    const db = client.db('warns');
    return db.collection('warns');
}

async function getAfkCollection() {
    await client.connect();
    const db = client.db('afk');
    return db.collection('statuses');
}

async function getLockCollection() {
    await client.connect();
    const db = client.db('locks');
    return db.collection('backups');
}

async function getAiUsageCollection() {
    await client.connect();
    const db = client.db('ai');
    return db.collection('usage');
}

async function getAntiLinksCollection() {
    await client.connect();
    const db = client.db('antilinks');
    return db.collection('configs');
}

async function getAntiProfanityCollection() {
    await client.connect();
    const db = client.db('antiprofanity');
    return db.collection('configs');
}

async function getWelcomeCollection() {
    await client.connect();
    const db = client.db('welcome');
    return db.collection('configs');
}

async function getAntiInvitesCollection() {
    await client.connect();
    const db = client.db('antiinvites');
    return db.collection('configs');
}

async function getAntiRaidCollection() {
    await client.connect();
    const db = client.db('antiraid');
    return db.collection('filters');
}

async function getAllowedRolesCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('allowedRoles');
}

async function getActiveTicketsCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('activeTickets');
}

async function getTicketRenamesCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('ticketRenames');
}

async function getTicketPanelCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('panelConfig');
}

async function getTicketClaimsCollection() {
    await client.connect();
    const db = client.db('tickets');
    const col = db.collection('claims');
    await col.createIndex({ channelId: 1 }, { unique: true }).catch(() => { });
    return col;
}

async function getTicketStatsCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('stats');
}

async function getCustomCommandsCollection() {
    await client.connect();
    const db = client.db('customcommands');
    return db.collection('commands');
}

async function getInvitesConfigCollection() {
    await client.connect();
    const db = client.db('invites');
    return db.collection('config');
}

async function getMessageCountsCollection() {
    await client.connect();
    const db = client.db('messagecounts');
    return db.collection('counts');
}

async function getMessageCountsConfigCollection() {
    await client.connect();
    const db = client.db('messagecounts');
    return db.collection('config');
}

async function getTicketBlacklistCollection() {
    await client.connect();
    const db = client.db('tickets');
    return db.collection('blacklist');
}

async function getLeftRolesCollection() {
    await client.connect();
    const db = client.db('rolesbackup');
    return db.collection('leftroles');
}

async function getSearchMessagesCollection() {
    await client.connect();
    const db = client.db('messages');
    const col = db.collection('messages');
    try {
        await col.createIndex({ messageId: 1 }, { unique: true });
    } catch { }
    try {
        await col.createIndex({ guildId: 1, channelId: 1, createdAt: -1 });
    } catch { }
    try {
        await col.createIndex({ contentNormalized: 'text' });
    } catch { }
    return col;
}

async function getSearchChannelsCollection() {
    await client.connect();
    const db = client.db('messages');
    const col = db.collection('channels');
    try {
        await col.createIndex({ channelId: 1 }, { unique: true });
    } catch { }
    try {
        await col.createIndex({ guildId: 1 });
    } catch { }
    return col;
}

async function getSearchMetaCollection() {
    await client.connect();
    const db = client.db('messages');
    const col = db.collection('meta');
    try {
        await col.createIndex({ guildId: 1, channelId: 1 }, { unique: true });
    } catch { }
    return col;
}

async function getReactRolesPresetsCollection() {
    await client.connect();
    const db = client.db('reactroles');
    return db.collection('presets');
}

async function getReactRolesMessagesCollection() {
    await client.connect();
    const db = client.db('reactroles');
    return db.collection('messages');
}

async function getGiveawaysCollection() {
    await client.connect();
    const db = client.db('giveaways');
    return db.collection('giveaways');
}

module.exports = { getCollection, getNukeCollection, getPlaylistsCollection, getInviteStatsCollection, getMemberInvitersCollection, getLeftMembersCollection, getWarnsCollection, getAfkCollection, getLockCollection, getAiUsageCollection, getAntiLinksCollection, getAntiProfanityCollection, getWelcomeCollection, getAntiInvitesCollection, getAntiRaidCollection, getAllowedRolesCollection, getActiveTicketsCollection, getTicketRenamesCollection, getTicketPanelCollection, getTicketClaimsCollection, getTicketStatsCollection, getCustomCommandsCollection, getInvitesConfigCollection, getMessageCountsCollection, getMessageCountsConfigCollection, getTicketBlacklistCollection, getLeftRolesCollection, getSearchMessagesCollection, getSearchChannelsCollection, getSearchMetaCollection, getReactRolesPresetsCollection, getReactRolesMessagesCollection, getGiveawaysCollection };


