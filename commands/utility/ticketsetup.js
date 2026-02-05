const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, ICONS, COLORS } = require('../../utils/helpers');
const TicketConfig = require('../../models/TicketConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketsetup')
        .setDescription('Configura el sistema de tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Configura y envía el panel de tickets')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal donde se enviará el panel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Rol de soporte que verá los tickets')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('categoria')
                        .setDescription('Categoría donde se crearán los tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('logs')
                        .setDescription('Canal para registros de tickets (opcional)')
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Gestiona la lista negra de tickets')
                .addStringOption(option =>
                    option.setName('accion')
                        .setDescription('Acción a realizar')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Añadir', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Listar', value: 'list' }
                        ))
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a gestionar')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('limite')
                .setDescription('Establece el límite de tickets por usuario')
                .addIntegerOption(option =>
                    option.setName('cantidad')
                        .setDescription('Cantidad máxima (0-20)')
                        .setMinValue(0)
                        .setMaxValue(20)
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            let config = await TicketConfig.findOne({ guildId });
            if (!config) {
                config = new TicketConfig({ guildId });
            }

            if (subcommand === 'panel') {
                const channel = interaction.options.getChannel('canal');
                const role = interaction.options.getRole('rol');
                const category = interaction.options.getChannel('categoria');
                const logs = interaction.options.getChannel('logs');

                config.panelChannelId = channel.id;
                config.supportRoleId = role.id;
                config.ticketCategory = category.id;
                if (logs) config.logsChannel = logs.id;

                const embed = new EmbedBuilder()
                    .setDescription(`<:ticket:1448487447460577522> **Soporte / Tickets**\n\nSi necesitas ayuda, reportar un usuario o tienes alguna duda, abre un ticket presionando el botón de abajo.`)
                    .setColor(0x2B2D31)
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_ticket')
                            .setLabel('Crear Ticket')
                            .setStyle(ButtonStyle.Primary)
                    );

                const message = await channel.send({ embeds: [embed], components: [row] });
                config.panelMessageId = message.id;
                await config.save();

                await interaction.reply({
                    embeds: [createSuccessEmbed('Panel Completado', `Panel de tickets configurado exitosamente en ${channel}.`)],
                    ephemeral: true
                });

            } else if (subcommand === 'blacklist') {
                const action = interaction.options.getString('accion');
                const user = interaction.options.getUser('usuario');

                if ((action === 'add' || action === 'remove') && !user) {
                    return interaction.reply({
                        embeds: [createErrorEmbed('Debes especificar un usuario.')],
                        ephemeral: true
                    });
                }

                if (action === 'add') {
                    if (config.blacklist.includes(user.id)) {
                        return interaction.reply({
                            embeds: [createErrorEmbed('Este usuario ya está en la blacklist.')],
                            ephemeral: true
                        });
                    }
                    config.blacklist.push(user.id);
                    await config.save();
                    await interaction.reply({
                        embeds: [createSuccessEmbed('Blacklist', `${user} ha sido añadido a la blacklist.`)],
                        ephemeral: true
                    });
                } else if (action === 'remove') {
                    if (!config.blacklist.includes(user.id)) {
                        return interaction.reply({
                            embeds: [createErrorEmbed('Este usuario no está en la blacklist.')],
                            ephemeral: true
                        });
                    }
                    config.blacklist = config.blacklist.filter(id => id !== user.id);
                    await config.save();
                    await interaction.reply({
                        embeds: [createSuccessEmbed('Blacklist', `${user} ha sido removido de la blacklist.`)],
                        ephemeral: true
                    });
                } else if (action === 'list') {
                    if (config.blacklist.length === 0) {
                        return interaction.reply({
                            embeds: [createErrorEmbed('La blacklist está vacía.')],
                            ephemeral: true
                        });
                    }
                    const list = config.blacklist.map(id => `<@${id}>`).join(', ');
                    await interaction.reply({
                        embeds: [createSuccessEmbed('Blacklist', `**Usuarios:**\n${list}`)],
                        ephemeral: true
                    });
                }

            } else if (subcommand === 'limite') {
                const limit = interaction.options.getInteger('cantidad');
                config.ticketLimit = limit;
                await config.save();
                await interaction.reply({
                    embeds: [createSuccessEmbed('Límite Actualizado', `Límite de tickets establecido a **${limit}** por usuario.`)],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({
                embeds: [createErrorEmbed('Ocurrió un error al ejecutar el comando.')],
                ephemeral: true
            });
        }
    },
};











