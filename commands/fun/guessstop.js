const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const GuessGame = require('../../models/GuessGame');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guessstop')
        .setDescription('Detiene el juego de adivinar el número')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await this.handleStop(interaction);
    },

    async messageRun(message) {
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.ManageMessages);

        // Check for staff role from database
        let hasStaffRole = false;
        try {
            const staffRoleDoc = await StaffRole.findOne({ guildId: message.guild.id });
            if (staffRoleDoc && message.member.roles.cache.has(staffRoleDoc.roleId)) {
                hasStaffRole = true;
            }
        } catch { }

        if (!hasPermission && !hasStaffRole) {
            return message.reply({ content: '<:deny:1448831817963536506> No tienes permiso para usar este comando.', ephemeral: true });
        }
        await this.handleStop(message);
    },

    async handleStop(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const game = await GuessGame.findOne({ guildId: source.guild.id });

            if (!game || !game.active) {
                return reply({ content: '<:deny:1448831817963536506> No hay ningún juego activo.', ephemeral: true });
            }

            const channel = await source.guild.channels.fetch(game.channelId).catch(() => null);

            // Find closest guess (within 5)
            let closestWinner = null;
            let closestDiff = Infinity;

            if (game.guesses && game.guesses.length > 0) {
                for (const g of game.guesses) {
                    const diff = Math.abs(g.guess - game.targetNumber);
                    if (diff <= 5 && diff < closestDiff) {
                        closestDiff = diff;
                        closestWinner = g.userId;
                    }
                }
            }

            if (channel) {
                // Get staff role to exclude from locking
                let staffRoleId = null;
                try {
                    const staffRoleDoc = await StaffRole.findOne({ guildId: source.guild.id });
                    if (staffRoleDoc) staffRoleId = staffRoleDoc.roleId;
                } catch { }

                // Lock channel and remove slowmode - @everyone and all roles (except staff)
                await channel.permissionOverwrites.edit(source.guild.roles.everyone, {
                    SendMessages: false
                });

                // Also lock all roles that have SendMessages allowed (except staff)
                const roleOverwrites = channel.permissionOverwrites.cache.filter(o =>
                    o.type === 0 && o.allow.has('SendMessages') && o.id !== staffRoleId
                );
                for (const [id] of roleOverwrites) {
                    await channel.permissionOverwrites.edit(id, { SendMessages: false });
                }

                await channel.setRateLimitPerUser(0);

                let embed;

                if (closestWinner) {
                    embed = new EmbedBuilder()
                        .setDescription(
                            `<:gift:1448486379221811384> **¡Juego Terminado - Ganador Más Cercano!**\n` +
                            `**El número era:** \`${game.targetNumber}\`\n` +
                            `**Ganador:** <@${closestWinner}>\n` +
                            `**Diferencia:** Solo \`${closestDiff}\` ${closestDiff === 1 ? 'número' : 'números'}\n` +
                            `**Premio:** ${game.prize}\n\n` +
                            `<:giveaway:1448143859673727119> <@${game.startedBy}> entrega el premio a <@${closestWinner}>`
                        )
                        .setColor(0x2B2D31);

                    await channel.send({
                        content: `<@${closestWinner}> <@${game.startedBy}>`,
                        embeds: [embed]
                    });
                } else {
                    embed = new EmbedBuilder()
                        .setDescription(
                            `<:warning:1448832070628671488> **Juego Cancelado**\n` +
                            `**El número era:** \`${game.targetNumber}\`\n` +
                            `Nadie estuvo a 5 números o menos del objetivo.\n` +
                            `**Total de intentos:** ${game.guesses?.length || 0}`
                        )
                        .setColor(0x2B2D31);

                    await channel.send({ embeds: [embed] });
                }

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

                const confirmMsg = await channel.send({ embeds: [confirmEmbed], components: [buttons] });

                const collector = confirmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

                collector.on('collect', async i => {
                    if (i.user.id !== (source.user?.id || source.author?.id)) {
                        return i.reply({ content: 'Solo quien ejecutó el comando puede confirmar.', ephemeral: true });
                    }

                    if (i.customId === 'guess_clear_yes') {
                        await i.update({ content: '<:checkmark:1448832045068583033> Limpiando mensajes...', embeds: [], components: [] });

                        // Delete all messages in batches
                        let deleted;
                        do {
                            const messages = await channel.messages.fetch({ limit: 100 });
                            const deletable = messages.filter(m => !m.pinned);
                            if (deletable.size === 0) break;
                            deleted = await channel.bulkDelete(deletable, true);
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
            }

            // Reset game state
            game.active = false;
            game.targetNumber = null;
            game.guesses = [];
            await game.save();

            const resultMsg = closestWinner
                ? `<:checkmark:1448832045068583033> Juego terminado. Ganador más cercano: <@${closestWinner}> (a ${closestDiff} del número)`
                : '<:checkmark:1448832045068583033> Juego terminado. Nadie estuvo lo suficientemente cerca.';

            await reply({ content: resultMsg, ephemeral: true });

        } catch (error) {
            console.error('Error stopping guess game:', error);
            await reply({ content: '<:deny:1448831817963536506> Error al detener el juego.', ephemeral: true });
        }
    }
};
