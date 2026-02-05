const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

async function deployCommands() {
    const commands = [];
    // Adjust path to point to 'commands' folder from 'utils'
    const foldersPath = path.join(__dirname, '../commands');

    // Ensure directory exists
    if (!fs.existsSync(foldersPath)) {
        console.error(`[DEPLOY] Commands directory not found at ${foldersPath}`);
        return;
    }

    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        // Skip if it's not a directory
        if (!fs.statSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`[ERROR] Error loading command at ${filePath}:`, error);
            }
        }
    }

    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
        console.error('[DEPLOY] Missing BOT_TOKEN or CLIENT_ID in environment variables.');
        return;
    }

    // Validate CLIENT_ID format
    const clientId = process.env.CLIENT_ID;
    if (!/^\d{17,19}$/.test(clientId)) {
        console.error(`[DEPLOY] Invalid CLIENT_ID format: "${clientId}". Must be 17-19 digits.`);
        return;
    }

    const rest = new REST().setToken(process.env.BOT_TOKEN);

    // Check for duplicate command names
    const commandNames = commands.map(cmd => cmd.name);
    const duplicates = commandNames.filter((name, index) => commandNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
        console.error(`[DEPLOY] ✗ Duplicate command names found: ${[...new Set(duplicates)].join(', ')}`);
        return;
    }

    try {
        console.log(`[DEPLOY] Refreshing ${commands.length} commands...`);

        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`[DEPLOY] ✓ ${data.length} commands deployed successfully.`);
    } catch (error) {
        // Clean error output
        if (error.code === 50035) {
            console.error('[DEPLOY] ✗ Invalid CLIENT_ID. Please check your .env file.');
        } else {
            console.error('[DEPLOY] ✗ Error:', error.message || error);
        }
    }
}

// Allow running directly: node utils/deploy.js
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };



