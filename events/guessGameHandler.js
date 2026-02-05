const GuessGame = require('../models/GuessGame');
const StaffRole = require('../models/StaffRole');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'guessGameHandler',

    async handleMessage(message) {
        // Ignore bots
        if (message.author.bot) return;

        try {
            // Check if there's an active game in this guild
            const game = await GuessGame.findOne({
                guildId: message.guild.id,
                channelId: message.channel.id,
                active: true
            });

            if (!game) return;

            // Block the host from guessing their own number
            if (message.author.id === game.startedBy) {
                try {
                    await message.delete();
                } catch (e) { }
                return;
            }

            // Check if message is a number
            const guess = parseInt(message.content.trim());

            if (isNaN(guess)) {
                // Not a number - delete the message
                try {
                    await message.delete();
                } catch (e) { }
                return;
            }

            // Track the guess
            if (!game.guesses) game.guesses = [];
            game.guesses.push({
                userId: message.author.id,
                guess: guess,
                timestamp: new Date()
            });
            await game.save();

            // Check if guess is correct
            if (guess === game.targetNumber) {
                // WINNER!
                await message.react('<:checkmark:1448832045068583033>');

                // Get staff role to exclude from locking
                let staffRoleId = null;
                try {
                    const staffRoleDoc = await StaffRole.findOne({ guildId: message.guild.id });
                    if (staffRoleDoc) staffRoleId = staffRoleDoc.roleId;
                } catch { }

                // Lock channel immediately - @everyone and all roles with SendMessages (except staff)
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });

                // Also lock all roles that have SendMessages allowed (except staff)
                const roleOverwrites = message.channel.permissionOverwrites.cache.filter(o =>
                    o.type === 0 && o.allow.has('SendMessages') && o.id !== staffRoleId
                );
                for (const [id] of roleOverwrites) {
                    await message.channel.permissionOverwrites.edit(id, { SendMessages: false });
                }

                await message.channel.setRateLimitPerUser(0);

                // Send winner announcement
                const winEmbed = new EmbedBuilder()
                    .setDescription(
                        `<:gift:1448486379221811384> **¡TENEMOS UN GANADOR!**\n` +
                        `**Ganador:** ${message.author}\n` +
                        `**Número:** \`${game.targetNumber}\`\n` +
                        `**Premio:** ${game.prize}\n\n` +
                        `<:giveaway:1448143859673727119> <@${game.startedBy}> entrega el premio a ${message.author}`
                    )
                    .setColor(0x2B2D31)
                    .setThumbnail(message.author.displayAvatarURL());

                await message.channel.send({
                    content: `<@${message.author.id}> <@${game.startedBy}>`,
                    embeds: [winEmbed]
                });

                // End game and clear guesses
                game.active = false;
                game.targetNumber = null;
                game.guesses = [];
                await game.save();

                // Cancel any active timer
                try {
                    const guessstart = require('../commands/fun/guessstart');
                    if (guessstart.gameTimers && guessstart.gameTimers.has(message.guild.id)) {
                        clearTimeout(guessstart.gameTimers.get(message.guild.id));
                        guessstart.gameTimers.delete(message.guild.id);
                    }
                } catch { }

                // Ask for confirmation to clear messages
                const confirmEmbed = new EmbedBuilder()
                    .setDescription(`<:warning:1448832070628671488> **¿Limpiar mensajes del canal?**\nEsto eliminará todos los mensajes del juego.`)
                    .setColor(0x2B2D31);

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('guess_clear_yes')
                            .setLabel('Sí, limpiar')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('guess_clear_no')
                            .setLabel('No')
                            .setStyle(ButtonStyle.Secondary)
                    );

                const confirmMsg = await message.channel.send({ embeds: [confirmEmbed], components: [buttons] });

                const collector = confirmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

                collector.on('collect', async i => {
                    // Only host can confirm
                    if (i.user.id !== game.startedBy) {
                        return i.reply({ content: 'Solo el host puede confirmar.', ephemeral: true });
                    }

                    if (i.customId === 'guess_clear_yes') {
                        await i.update({ content: '<:checkmark:1448832045068583033> Limpiando mensajes...', embeds: [], components: [] });

                        // Delete all messages in batches
                        let deleted;
                        do {
                            const messages = await message.channel.messages.fetch({ limit: 100 });
                            const deletable = messages.filter(m => !m.pinned);
                            if (deletable.size === 0) break;
                            deleted = await message.channel.bulkDelete(deletable, true);
                        } while (deleted && deleted.size >= 2);

                    } else {
                        await i.update({ content: '<:checkmark:1448832045068583033> No se limpiaron los mensajes.', embeds: [], components: [] });
                        setTimeout(() => confirmMsg.delete().catch(() => { }), 3000);
                    }
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        confirmMsg.delete().catch(() => { });
                    }
                });

            } else {
                // Wrong guess
                await message.react('<:deny:1448831817963536506>');
            }

        } catch (error) {
            console.error('Error in guess game handler:', error);
        }
    }
};
