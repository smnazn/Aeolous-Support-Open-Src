// Preload encryption libraries BEFORE any @discordjs/voice import
// These must be loaded synchronously before anything else
try {
    require('sodium-native');
} catch (e1) {
    try {
        require('@noble/ciphers');
    } catch (e2) {
        try {
            require('tweetnacl');
        } catch (e3) {
            // No voice encryption
        }
    }
}

// Also preload libsodium-wrappers (async)
const sodium = require('libsodium-wrappers');

async function main() {
    // Wait for sodium to be ready as backup
    await sodium.ready;

    const fs = require('node:fs');
    const path = require('node:path');
    const { Client, Collection, GatewayIntentBits } = require('discord.js');
    require('dotenv').config({ quiet: true });
    const { connectDatabase } = require('./utils/database');
    const { deployCommands } = require('./utils/deploy');

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildModeration  // Required for ban/unban events
        ]
    });

    client.commands = new Collection();
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            command.category = folder;
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }

    // Connect to database and start bot
    await connectDatabase();

    // Deploy slash commands
    await deployCommands();

    await client.login(process.env.BOT_TOKEN);

    // Lavalink disabled temporarily
    // const { initializeLavalink } = require('./utils/lavalink');
    // client.kazagumo = initializeLavalink(client);

    // Initialize Invite Tracker
    const InviteTracker = require('./utils/InviteTracker');
    client.inviteTracker = new InviteTracker(client);
    await client.inviteTracker.init();

    // Start giveaway checker
    const { checkGiveaways } = require('./utils/giveawayChecker');
    setInterval(() => checkGiveaways(client), 60000); // Check every minute

    // Start auto-backup system
    const { startAutoBackup } = require('./utils/autoBackup');
    startAutoBackup(client);

    // API server now runs separately (AeolousAPIX repo)
}

main().catch(err => {
    console.error('[FATAL] Startup error:', err);
    process.exit(1);
});
