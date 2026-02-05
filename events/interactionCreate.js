const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('../utils/icons');
const { getKazagumo, createMusicControls, createNowPlayingEmbed } = require('../utils/lavalink');
const CustomCommand = require('../models/CustomCommand');
const { getPrefix } = require('../utils/guildConfig');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Modal Submits
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'changelog_modal') {
                const title = interaction.fields.getTextInputValue('changelog_title');
                const content = interaction.fields.getTextInputValue('changelog_content');
                const footer = interaction.fields.getTextInputValue('changelog_footer') || null;

                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.WARNING} ${title} ${DISCO_ICONS.WARNING}`)
                    .setDescription(content)
                    .setColor(0x2B2D31);

                if (footer) {
                    embed.setFooter({ text: footer });
                }

                await interaction.channel.send({ embeds: [embed] });
                await interaction.reply({ content: `${DISCO_ICONS.CHECKMARK} Changelog enviado.`, ephemeral: true });
                return;
            }

            // Handle Custom Command Modals
            if (interaction.customId.startsWith('cmdmodal_')) {
                const parts = interaction.customId.split('_');
                const field = parts[1]; // title, desc, color, footer, image, thumb
                const cmdName = parts.slice(2).join('_');

                const cmd = await CustomCommand.findOne({ guildId: interaction.guildId, name: cmdName });
                if (!cmd) {
                    return interaction.reply({ content: `${DISCO_ICONS.ERROR} Comando no encontrado.`, ephemeral: true });
                }

                const value = interaction.fields.getTextInputValue('cmd_input');

                switch (field) {
                    case 'title':
                        cmd.embedTitle = value || null;
                        break;
                    case 'desc':
                        cmd.embedDescription = value || '꒷꒦ ﹒ Sin descripción ﹒ ꒷꒦';
                        break;
                    case 'color':
                        const hex = value.replace('#', '');
                        if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                            cmd.embedColor = parseInt(hex, 16);
                        }
                        break;
                    case 'footer':
                        cmd.embedFooter = value || null;
                        break;
                    case 'image':
                        cmd.embedImage = value || null;
                        break;
                    case 'thumb':
                        cmd.embedThumbnail = value || null;
                        break;
                }

                await cmd.save();

                // Rebuild panel
                const prefix = await getPrefix(interaction.guildId);
                const previewEmbed = new EmbedBuilder()
                    .setDescription(cmd.embedDescription)
                    .setColor(cmd.embedColor || 0x2B2D31);

                if (cmd.embedTitle) previewEmbed.setTitle(cmd.embedTitle);
                if (cmd.embedImage) previewEmbed.setImage(cmd.embedImage);
                if (cmd.embedThumbnail) previewEmbed.setThumbnail(cmd.embedThumbnail);
                if (cmd.embedFooter) previewEmbed.setFooter({ text: cmd.embedFooter });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`cmd_title_${cmdName}`).setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`cmd_desc_${cmdName}`).setLabel('Descripción').setEmoji('💬').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`cmd_color_${cmdName}`).setLabel('Color').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`cmd_footer_${cmdName}`).setLabel('Footer').setEmoji('📎').setStyle(ButtonStyle.Secondary)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`cmd_image_${cmdName}`).setLabel('Imagen').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`cmd_thumb_${cmdName}`).setLabel('Thumbnail').setEmoji('🔲').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`cmd_done_${cmdName}`).setLabel('Listo').setEmoji('✅').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`cmd_delete_${cmdName}`).setLabel('Eliminar').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
                );

                await interaction.update({ embeds: [previewEmbed], components: [row1, row2] });
                return;
            }
        }

        // Handle Custom Command Button Interactions
        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith('cmd_')) {
                const parts = customId.split('_');
                const action = parts[1];
                const cmdName = parts.slice(2).join('_');

                const cmd = await CustomCommand.findOne({ guildId: interaction.guildId, name: cmdName });
                if (!cmd) {
                    return interaction.reply({ content: `${DISCO_ICONS.ERROR} Comando no encontrado.`, ephemeral: true });
                }

                // Handle different button actions
                switch (action) {
                    case 'title':
                    case 'desc':
                    case 'footer':
                    case 'image':
                    case 'thumb':
                    case 'color': {
                        const labels = {
                            title: 'Título del Embed',
                            desc: 'Descripción del Embed',
                            footer: 'Footer del Embed',
                            image: 'URL de Imagen',
                            thumb: 'URL de Thumbnail',
                            color: 'Color (hex, ej: #FF0000)'
                        };

                        const placeholders = {
                            title: '✦ Mi Título ✦',
                            desc: '꒷꒦ ﹒ Tu mensaje aquí ﹒ ꒷꒦',
                            footer: 'Texto del footer',
                            image: 'https://ejemplo.com/imagen.png',
                            thumb: 'https://ejemplo.com/thumb.png',
                            color: '#2B2D31'
                        };

                        const currentValues = {
                            title: cmd.embedTitle || '',
                            desc: cmd.embedDescription || '',
                            footer: cmd.embedFooter || '',
                            image: cmd.embedImage || '',
                            thumb: cmd.embedThumbnail || '',
                            color: cmd.embedColor ? `#${cmd.embedColor.toString(16).padStart(6, '0')}` : '#2B2D31'
                        };

                        const modal = new ModalBuilder()
                            .setCustomId(`cmdmodal_${action}_${cmdName}`)
                            .setTitle(labels[action]);

                        const input = new TextInputBuilder()
                            .setCustomId('cmd_input')
                            .setLabel(labels[action])
                            .setStyle(action === 'desc' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                            .setPlaceholder(placeholders[action])
                            .setValue(currentValues[action])
                            .setRequired(action === 'desc');

                        modal.addComponents(new ActionRowBuilder().addComponents(input));
                        await interaction.showModal(modal);
                        return;
                    }

                    case 'done':
                    case 'save': {
                        const prefix = await getPrefix(interaction.guildId);
                        const successEmbed = new EmbedBuilder()
                            .setDescription(
                                `${DISCO_ICONS.CHECKMARK} **Comando guardado exitosamente**\n\n` +
                                `${DISCO_ICONS.POINT} **Uso:** \`${prefix}${cmdName}\`\n` +
                                `${DISCO_ICONS.POINT} **Editar:** \`${prefix}editcmd ${cmdName}\``
                            )
                            .setColor(0x2B2D31);
                        await interaction.update({ embeds: [successEmbed], components: [] });
                        return;
                    }

                    case 'cancel': {
                        await CustomCommand.deleteOne({ guildId: interaction.guildId, name: cmdName });
                        const cancelEmbed = new EmbedBuilder()
                            .setDescription(`${DISCO_ICONS.CROSSMARK} Creación de comando cancelada.`)
                            .setColor(0x2B2D31);
                        await interaction.update({ embeds: [cancelEmbed], components: [] });
                        return;
                    }

                    case 'delete': {
                        await CustomCommand.deleteOne({ guildId: interaction.guildId, name: cmdName });
                        const deleteEmbed = new EmbedBuilder()
                            .setDescription(`${DISCO_ICONS.CHECKMARK} Comando \`${cmdName}\` eliminado.`)
                            .setColor(0x2B2D31);
                        await interaction.update({ embeds: [deleteEmbed], components: [] });
                        return;
                    }
                }
            }

            // Check if it's a music button
            if (customId.startsWith('music_')) {
                const kazagumo = getKazagumo(interaction.client);
                if (!kazagumo) {
                    return interaction.reply({ content: `${DISCO_ICONS.ERROR} Sistema de música no disponible`, ephemeral: true });
                }

                const player = kazagumo.players.get(interaction.guildId);
                if (!player) {
                    return interaction.reply({ content: `${DISCO_ICONS.ERROR} No hay música reproduciéndose`, ephemeral: true });
                }

                // Check if user is in the same voice channel
                const member = interaction.member;
                if (!member.voice?.channel || member.voice.channel.id !== player.voiceId) {
                    return interaction.reply({ content: `${DISCO_ICONS.WARNING} Debes estar en el canal de voz`, ephemeral: true });
                }

                try {
                    switch (customId) {
                        case 'music_pause_resume':
                            if (player.paused) {
                                player.pause(false);
                                await interaction.reply({ content: `${DISCO_ICONS.PLAY} Reproducción reanudada`, ephemeral: true });
                            } else {
                                player.pause(true);
                                await interaction.reply({ content: `${DISCO_ICONS.PAUSE} Reproducción pausada`, ephemeral: true });
                            }
                            break;

                        case 'music_prev':
                            // Previous track - not typically supported, go to start of current track
                            if (player.shopiuPlayer) {
                                player.seekTo(0);
                            }
                            await interaction.reply({ content: `${DISCO_ICONS.ARROW_LEFT} Reiniciando canción`, ephemeral: true });
                            break;

                        case 'music_next':
                            if (player.queue.size === 0) {
                                await interaction.reply({ content: `${DISCO_ICONS.WARNING} No hay más canciones en la cola`, ephemeral: true });
                            } else {
                                player.skip();
                                await interaction.reply({ content: `${DISCO_ICONS.ARROW_RIGHT} Saltando a la siguiente canción`, ephemeral: true });
                            }
                            break;

                        case 'music_loop':
                            // Cycle through loop modes: none -> track -> queue -> none
                            const currentLoop = player.loop;
                            let newLoop, loopMessage;
                            if (currentLoop === 'none') {
                                newLoop = 'track';
                                loopMessage = 'Repetir canción activado';
                            } else if (currentLoop === 'track') {
                                newLoop = 'queue';
                                loopMessage = 'Repetir cola activado';
                            } else {
                                newLoop = 'none';
                                loopMessage = 'Repetición desactivada';
                            }
                            player.setLoop(newLoop);
                            await interaction.reply({ content: `${DISCO_ICONS.MUSIC_REPEAT} ${loopMessage}`, ephemeral: true });
                            break;

                        case 'music_shuffle':
                            if (player.queue.size < 2) {
                                await interaction.reply({ content: `${DISCO_ICONS.WARNING} Necesitas al menos 2 canciones para mezclar`, ephemeral: true });
                            } else {
                                player.queue.shuffle();
                                await interaction.reply({ content: `${DISCO_ICONS.SHUFFLE} Cola mezclada`, ephemeral: true });
                            }
                            break;

                        case 'music_stop':
                            player.destroy();
                            await interaction.reply({ content: `${DISCO_ICONS.BLOCK} Reproducción detenida`, ephemeral: true });
                            break;

                        default:
                            await interaction.reply({ content: `${DISCO_ICONS.ERROR} Acción no reconocida`, ephemeral: true });
                    }

                    // Update the now playing message with new button states
                    if (customId !== 'music_stop' && player.queue.current) {
                        const nowPlayingMsg = player.data.get('nowPlayingMessage');
                        if (nowPlayingMsg) {
                            try {
                                const newControls = createMusicControls(player);
                                await nowPlayingMsg.edit({ components: newControls });
                            } catch { }
                        }
                    }
                } catch (error) {
                    console.error('[Music Button] Error:', error);
                    if (!interaction.replied) {
                        await interaction.reply({ content: `${DISCO_ICONS.ERROR} Error: ${error.message}`, ephemeral: true });
                    }
                }
                return;
            }
        }

        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        }
    },
};

