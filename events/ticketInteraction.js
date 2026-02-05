const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TicketConfig = require('../models/TicketConfig');
const Ticket = require('../models/Ticket');
const { createErrorEmbed, createSuccessEmbed, ICONS, COLORS } = require('../utils/helpers');

// Cooldown map: userId -> timestamp
const cooldowns = new Map();
const COOLDOWN_TIME = 60000; // 1 minute cooldown

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guild, user } = interaction;

        if (!['create_ticket', 'close_ticket', 'claim_ticket', 'delete_ticket'].includes(customId)) return;

        try {
            const config = await TicketConfig.findOne({ guildId: guild.id });
            if (!config) {
                return interaction.reply({
                    embeds: [createErrorEmbed('El sistema de tickets no está configurado.')],
                    ephemeral: true
                });
            }

            const replyError = async (msg) => {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [createErrorEmbed(msg)], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [createErrorEmbed(msg)], ephemeral: true });
                }
            };

            const replySuccess = async (title, msg) => {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [createSuccessEmbed(title, msg)], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [createSuccessEmbed(title, msg)], ephemeral: true });
                }
            };

            if (customId === 'create_ticket') {
                // Rate Limiting
                if (cooldowns.has(user.id)) {
                    const expirationTime = cooldowns.get(user.id) + COOLDOWN_TIME;
                    const now = Date.now();
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return replyError(`Por favor espera ${timeLeft.toFixed(1)} segundos antes de crear otro ticket.`);
                    }
                }

                // Check blacklist
                if (config.blacklist.includes(user.id)) {
                    return replyError('Estás en la lista negra y no puedes crear tickets.');
                }

                // Check limit
                const activeTickets = await Ticket.countDocuments({ guildId: guild.id, userId: user.id, status: { $ne: 'closed' } });
                if (config.ticketLimit > 0 && activeTickets >= config.ticketLimit) {
                    return replyError(`Has alcanzado el límite de ${config.ticketLimit} tickets abiertos.`);
                }

                // Set cooldown
                cooldowns.set(user.id, Date.now());
                setTimeout(() => cooldowns.delete(user.id), COOLDOWN_TIME);

                // Create ticket
                config.ticketCounter += 1;
                await config.save();

                const ticketChannel = await guild.channels.create({
                    name: `aeo-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: config.ticketCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                        },
                        {
                            id: config.supportRoleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                        },
                        {
                            id: interaction.client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                        }
                    ],
                });

                const ticket = new Ticket({
                    guildId: guild.id,
                    channelId: ticketChannel.id,
                    userId: user.id,
                    ticketId: config.ticketCounter,
                    status: 'open'
                });
                await ticket.save();

                const embed = new EmbedBuilder()
                    .setTitle(`<:ticket:1448487447460577522> Ticket #${config.ticketCounter}`)
                    .setDescription(`Hola ${user}, el staff te atenderá pronto.\n\n**Detalles:**\n${ICONS.POINT} **Usuario:** ${user}`)
                    .setColor(COLORS.DEFAULT)
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('Cerrar')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('claim_ticket')
                            .setLabel('Reclamar')
                            .setStyle(ButtonStyle.Success)
                    );

                await ticketChannel.send({ content: `${user} <@&${config.supportRoleId}>`, embeds: [embed], components: [row] });
                await replySuccess('Ticket Creado', `Ticket creado exitosamente: ${ticketChannel}`);

            } else if (customId === 'close_ticket') {
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
                if (!ticket) return replyError('No se encontró el ticket en la base de datos.');

                // Prevent ticket creator from closing their own ticket
                if (ticket.userId === user.id) {
                    return replyError('No puedes cerrar tu propio ticket. Solo el staff puede cerrarlo.');
                }

                // Only staff can close
                if (!interaction.member.roles.cache.has(config.supportRoleId) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return replyError('No tienes permisos para cerrar tickets.');
                }

                ticket.status = 'closed';
                ticket.closedAt = new Date();
                ticket.closedBy = user.id;
                await ticket.save();

                const embed = new EmbedBuilder()
                    .setDescription(`${ICONS.LOADING} Ticket cerrado por ${user}. El canal se eliminará en 5 segundos.`)
                    .setColor(COLORS.DEFAULT);

                await interaction.reply({ embeds: [embed] });

                // Generate HTML transcript
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    const sortedMessages = Array.from(messages.values()).reverse();

                    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Ticket #${ticket.ticketId}</title>
    <style>@import url('https://fonts.googleapis.com/css?family=Poppins:200,300,400,500,600,700,800,900display=swap');:root{  --primary: #53b8e6;  --primary-transparent1: rgba(83,184,230,.7);  --primary-type2: #0072ae;  --secondary: #202225;  --secondary-type2: #36393f;  --secondary-type3: #2f3136;  --secondary-type4: #1c1d20; /* Inputs */  --secondary-type5: #121315;  --secondary-type6: #18191c;  --secondary-type7: #2f2f32;  --secondary-type8: #36373d; /* Cards */  --text: #dcddde;  --text-type2: #72767d;  --red: #ED4245;  --red-type2: #9b3d41;  --red-transparent1: rgba(237,66,69,.7);  --green: #57F287;  --green-type2: #3ba55d;  --green-transparent1: rgba(87,242,135,.7);  --yellow: #FEE75C;  --yellow-type2: #a4994e;  --yellow-transparent1: rgba(254,231,92,.7);  --pink: #EB459E;  --blurple: #5865F2;  --blurple-transparent1: rgba(88,101,246,.7);  --black: #040405;  --gold: #faa81a;  --gold-transparent1: rgba(250,168,26,.7);}::-webkit-scrollbar {  width: 10px;   height: 10px;}::-webkit-scrollbar-thumb {  background: var(--secondary);  border-radius: 4px;}::-webkit-scrollbar-track{  background: transparent;  border-radius: 0px;}*{  margin: 0;  padding: 0;  box-sizing: border-box;  font-family: 'Poppins', sans-serif;}body{  overflow-x: hidden;  background: #36393e;  color: #fff;}.transcript-top .guild{  margin: 2rem;  display: flex;  align-items: center;}.transcript-top .guild .guild-image img{  height: 100px;  width: 100px;  border-radius: 50%;}.transcript-top .guild .guild-data{  margin-left: 30px;}.transcript-top .guild .guild-data .guild-name{  font-weight: bold;  font-size: 1.7rem;}.transcript-top .guild .guild-data .guild-name .guild-id{  font-weight: normal;  font-size: 1rem;  color: var(--text-type2);  margin-left: 5px;}.transcript-top .transcript-spam{  background: var(--secondary-type5);  display: flex;  align-items: center;  padding: 1rem;  margin: 0rem 2rem;  border-radius: 10px;}.transcript-top .transcript-spam .guildmanager-avatar img{  height: 50px;  width: 50px;  border-radius: 50%;  margin-right: 15px;}.transcript-top .transcript-spam .guildmanager-data{  font-weight: bold;}.transcript-top .transcript-spam .guildmanager-data a{  text-decoration: none;  color: var(--primary);}.chat-box{  margin: 2rem;}.chat-box .chat-message-group .messages-author{  display: flex;  align-items: center;}.chat-box .chat-message-group .messages-author .msgs-author-avatar img{  height: 50px;  width: 50px;  border-radius: 50%;  margin-right: 10px;}.chat-box .chat-message-group .messages-author .msgs-author-data .author-tag{  font-weight: bold;  color: var(--text);}.chat-box .chat-message-group .messages-author .msgs-author-data .author-tag .author-discriminator{  font-weight: normal;  color: var(--text-type2);}.chat-box .chat-message-group .messages-author .msgs-author-data .author-bot{  margin-left: 5px; background: #7289da;  padding: 2px;  border-radius: 4px;  font-weight: bold;  font-size: .8rem;}.chat-box .chat-message-group .messages-author .msgs-author-data .msg-date{  color: var(--text-type2); margin-left: 5px; }.chat-box .chat-message-group .chat-messages{  margin-left: 60px;}.chat-box .chat-message-group .chat-messages .msg-components,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .title,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .field .name{  margin-top: 10px;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .description,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .field .value{  color: var(--text);  word-break: break-all;  margin-bottom: 5px;}.chat-box .chat-message-group .chat-messages .msg-content img,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .description img,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .field .value img, .d-emoji{  max-height: 25px;  max-width: 25px;  margin: 0 3px;  vertical-align: middle;}.chat-box .chat-message-group .chat-messages .msg-content .msg-embed-format{border-left: 5px solid var(--secondary);padding-left: 15px;}.chat-box .chat-message-group .chat-messages .msg-content .msg-no-content{height:10px;}.chat-box .chat-message-group .chat-messages .msg-content .code, code {background: var(--secondary);padding: 2px 4px;font-size: .8rem;border-radius: 4px;}.chat-box .chat-message-group .chat-messages .msg-content a, .chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed a{color:var(--blurple);}.chat-box .chat-message-group .chat-messages .msg-components .row{margin-bottom: 10px;} .chat-box .chat-message-group .chat-messages .msg-files{margin-top: 10px;}.chat-box .chat-message-group .chat-messages .msg-files .file.image img,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .image img{  margin-bottom: 15px;  max-width: 450px;max-height: 650px;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed{  margin: 10px 0px;  border-radius: 7px;  padding: 15px;  width: fit-content;  display: flex;  background-color: rgba(46,48,54,.3);  border: 1px solid;  border-color: rgba(46,48,54,.6);  border-left: 6px solid #000;  max-width: 100%;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .thumbnail img{  margin-left: 20px;  max-height: 100px;  max-width: 100px;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .author-footer{  display: flex;  align-items: center;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .author-footer img{  height: 35px;  width: 35px;  border-radius: 50%;  margin-right: 10px;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .author-footer .text,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .title,.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .field .name{  font-weight: bold;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .inline-fields{  display: flex;  justify-content: space-between;  flex-wrap: wrap;}.chat-box .chat-message-group .chat-messages .msg-embeds .msg-embed .embed-data .inline-fields .field{  margin-right: 20px;}.mention{  color: #7289da;}</style>
</head>
<body>
    <div class="transcript-top">
      <div class="guild">
        <div class="guild-image">
          <img src="${guild.iconURL({ dynamic: true }) || 'https://guildmanager.xyz/img/servericon.png'}">
        </div>
        <div class="guild-data">
          <div class="guild-name">${guild.name}<span class="guild-id">${guild.id}</span></div>
          <div class="ticket-channel">#${interaction.channel.name}</div>
          <div class="ticket-channel-messages">${messages.size} mensajes</div>
        </div>
      </div>
      <div class="transcript-spam">
        <div class="guildmanager-avatar">
          <img src="${interaction.client.user.displayAvatarURL()}">
        </div>
        <div class="guildmanager-data">
          Transcripción generada por <strong>${interaction.client.user.username}</strong>
        </div>
      </div>
      <div class="chat-box">`;

                    for (const msg of sortedMessages) {
                        const timestamp = msg.createdAt.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const content = msg.content
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/@(everyone|here)/g, '<span class="mention">@$1</span>')
                            .replace(/<@&?(\d+)>/g, '<span class="mention">@Role/User</span>');

                        const botTag = msg.author.bot ? `<span class="author-bot">BOT</span>` : '';

                        html += `
        <div class="chat-message-group">
            <div class="messages-author">
                <div class="msgs-author-avatar">
                    <img src="${msg.author.displayAvatarURL({ dynamic: true })}" onerror="this.onerror=null;this.src='https://guildmanager.xyz/img/servericon.png'">
                </div>
                <div class="msgs-author-data">
                    <span class="author-tag">${msg.author.username}<span class="author-discriminator">#${msg.author.discriminator}</span></span>${botTag}
                    <span class="msg-date">${timestamp}</span>
                </div>
            </div>
            <div class="chat-messages">
                <div class="chat-message">
                    <div class="msg-content">${content || ''}</div>`;

                        if (msg.attachments.size > 0) {
                            html += `<div class="msg-files">`;
                            msg.attachments.forEach(att => {
                                if (att.contentType && att.contentType.startsWith('image/')) {
                                    html += `<div class="file image"><img src="${att.url}"></div>`;
                                } else {
                                    html += `<div class="file discord-file"><div class="data"><a href="${att.url}" target="_blank">${att.name}</a></div></div>`;
                                }
                            });
                            html += `</div>`;
                        }

                        if (msg.embeds.length > 0) {
                            html += `<div class="msg-embeds">`;
                            msg.embeds.forEach(embed => {
                                const color = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#202225';
                                html += `<div class="msg-embed" style="border-left-color:${color}">
                                    <div class="embed-data">
                                        ${embed.title ? `<div class="title">${embed.title}</div>` : ''}
                                        ${embed.description ? `<div class="description">${embed.description.replace(/\n/g, '<br>')}</div>` : ''}
                                        <div class="fields-box">`;

                                if (embed.fields) {
                                    embed.fields.forEach(field => {
                                        html += `<div class="inline-fields">
                                            <div class="field">
                                                <div class="name">${field.name}</div>
                                                <div class="value">${field.value}</div>
                                            </div>
                                        </div>`;
                                    });
                                }

                                html += `</div></div></div>`;
                            });
                            html += `</div>`;
                        }

                        html += `</div></div></div>`;
                    }

                    html += `</div></div></body></html>`;

                    // Send transcript to logs channel
                    if (config.logsChannel) {
                        const logsChannel = guild.channels.cache.get(config.logsChannel);
                        if (logsChannel) {
                            const buffer = Buffer.from(html, 'utf-8');
                            const logEmbed = new EmbedBuilder()
                                .setTitle(`${ICONS.LOADING} Ticket Cerrado #${ticket.ticketId}`)
                                .addFields(
                                    { name: 'Abierto por', value: `<@${ticket.userId}>`, inline: true },
                                    { name: 'Cerrado por', value: `${user}`, inline: true },
                                    { name: 'Reclamado por', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Nadie', inline: true }
                                )
                                .setColor(COLORS.DEFAULT)
                                .setTimestamp();

                            await logsChannel.send({
                                embeds: [logEmbed],
                                files: [{ attachment: buffer, name: `ticket-${ticket.ticketId}.html` }]
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error generating transcript:', error);
                    // Continue deletion even if transcript fails
                }

                setTimeout(() => {
                    if (interaction.channel) {
                        interaction.channel.delete().catch(console.error);
                    }
                }, 5000);

            } else if (customId === 'claim_ticket') {
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
                if (!ticket) return replyError('No se encontró el ticket.');

                // Prevent ticket creator from claiming their own ticket
                if (ticket.userId === user.id) {
                    return replyError('No puedes reclamar tu propio ticket.');
                }

                // Check if user has support role
                if (!interaction.member.roles.cache.has(config.supportRoleId) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return replyError('No tienes permisos para reclamar tickets.');
                }

                // Toggle claim system
                if (ticket.claimedBy) {
                    if (ticket.claimedBy === user.id) {
                        ticket.claimedBy = null;
                        ticket.status = 'open';
                        await ticket.save();

                        await replySuccess('Ticket Liberado', `${user} ha liberado el ticket. Ahora otro staff puede reclamarlo.`);
                    } else {
                        return replyError(`Este ticket ya fue reclamado por <@${ticket.claimedBy}>. Solo esa persona puede liberarlo.`);
                    }
                } else {
                    ticket.claimedBy = user.id;
                    ticket.status = 'claimed';
                    // Add to claim history for stats tracking (only if not already in history)
                    if (!ticket.claimedHistory) ticket.claimedHistory = [];
                    if (!ticket.claimedHistory.includes(user.id)) {
                        ticket.claimedHistory.push(user.id);
                    }
                    await ticket.save();

                    // Send public message so everyone can see
                    const claimEmbed = createSuccessEmbed('Ticket Reclamado', `Ticket reclamado por ${user}.`);
                    await interaction.channel.send({ embeds: [claimEmbed] });
                    await interaction.reply({ content: '✅', ephemeral: true });
                }
            }

        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [createErrorEmbed('Ocurrió un error al procesar la interacción.')], ephemeral: true });
            } else {
                await interaction.followUp({ embeds: [createErrorEmbed('Ocurrió un error al procesar la interacción.')], ephemeral: true });
            }
        }
    },
};





