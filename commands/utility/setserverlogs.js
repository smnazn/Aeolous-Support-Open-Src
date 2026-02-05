const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ServerLogConfig = require('../../models/ServerLogConfig');
const { DISCO_ICONS } = require('../../utils/icons');

const LOG_TOGGLE_OPTIONS = [
    { name: 'Cambios de Rol', value: 'roles', field: 'logRoleChanges' },
    { name: 'Cambios de Nick', value: 'nicks', field: 'logNickChanges' },
    { name: 'Mensajes Eliminados', value: 'delete', field: 'logMessageDelete' },
    { name: 'Mensajes Editados', value: 'edit', field: 'logMessageEdit' },
    { name: 'Cambios de Canales', value: 'channels', field: 'logChannelChanges' },
    { name: 'Bans/Unbans', value: 'bans', field: 'logBans' },
    { name: 'Timeouts', value: 'timeouts', field: 'logTimeouts' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setserverlogs')
        .setDescription('Configura el canal de logs del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('channel')
            .setDescription('Establece el canal de logs del servidor')
            .addChannelOption(opt => opt
                .setName('canal')
                .setDescription('El canal donde se enviarán los logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Desactiva los logs del servidor')
        )
        .addSubcommand(sub => sub
            .setName('toggle')
            .setDescription('Activa o desactiva un tipo de log específico')
            .addStringOption(opt => opt
                .setName('tipo')
                .setDescription('El tipo de log a modificar')
                .setRequired(true)
                .addChoices(...LOG_TOGGLE_OPTIONS.map(o => ({ name: o.name, value: o.value })))
            )
        )
        .addSubcommand(sub => sub
            .setName('ignore')
            .setDescription('Ignora un canal específico')
            .addChannelOption(opt => opt
                .setName('canal')
                .setDescription('El canal a ignorar')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('unignore')
            .setDescription('Deja de ignorar un canal')
            .addChannelOption(opt => opt
                .setName('canal')
                .setDescription('El canal a dejar de ignorar')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Muestra la configuración actual de los logs')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let config = await ServerLogConfig.findOne({ guildId: interaction.guild.id });

        if (!config) {
            config = new ServerLogConfig({ guildId: interaction.guild.id });
        }

        switch (subcommand) {
            case 'channel': {
                const channel = interaction.options.getChannel('canal');
                config.logChannelId = channel.id;
                await config.save();

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#00ff00')
                        .setDescription(`${DISCO_ICONS.SUCCESS} **Canal de logs establecido**\n\n${DISCO_ICONS.POINT} Los logs se enviarán a ${channel}\n${DISCO_ICONS.POINT} Todos los tipos de log están activados por defecto`)
                        .setFooter({ text: `Configurado por ${interaction.user.tag}` })
                        .setTimestamp()
                    ]
                });
            }

            case 'disable': {
                config.logChannelId = null;
                await config.save();

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`${DISCO_ICONS.ERROR} **Logs del servidor desactivados**\n\n${DISCO_ICONS.POINT} Ya no se registrarán las acciones del servidor`)
                        .setTimestamp()
                    ]
                });
            }

            case 'toggle': {
                const tipo = interaction.options.getString('tipo');
                const option = LOG_TOGGLE_OPTIONS.find(o => o.value === tipo);

                config[option.field] = !config[option.field];
                await config.save();

                const isEnabled = config[option.field];
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(isEnabled ? '#00ff00' : '#ff0000')
                        .setDescription(`${isEnabled ? DISCO_ICONS.SUCCESS : DISCO_ICONS.ERROR} **${option.name}** ha sido **${isEnabled ? 'activado' : 'desactivado'}**`)
                        .setTimestamp()
                    ]
                });
            }

            case 'ignore': {
                const channel = interaction.options.getChannel('canal');

                if (config.ignoredChannels.includes(channel.id)) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ffff00')
                            .setDescription(`${DISCO_ICONS.WARNING} ${channel} ya está en la lista de canales ignorados`)
                            .setTimestamp()
                        ], ephemeral: true
                    });
                }

                config.ignoredChannels.push(channel.id);
                await config.save();

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#00ff00')
                        .setDescription(`${DISCO_ICONS.SUCCESS} ${channel} **añadido a la lista de canales ignorados**\n\n${DISCO_ICONS.POINT} Los mensajes de este canal no serán registrados`)
                        .setTimestamp()
                    ]
                });
            }

            case 'unignore': {
                const channel = interaction.options.getChannel('canal');

                if (!config.ignoredChannels.includes(channel.id)) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ffff00')
                            .setDescription(`${DISCO_ICONS.WARNING} ${channel} no está en la lista de canales ignorados`)
                            .setTimestamp()
                        ], ephemeral: true
                    });
                }

                config.ignoredChannels = config.ignoredChannels.filter(id => id !== channel.id);
                await config.save();

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#00ff00')
                        .setDescription(`${DISCO_ICONS.SUCCESS} ${channel} **removido de la lista de canales ignorados**`)
                        .setTimestamp()
                    ]
                });
            }

            case 'status': {
                const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : 'No configurado';
                const ignoredList = config.ignoredChannels.length > 0
                    ? config.ignoredChannels.map(id => `<#${id}>`).join(', ')
                    : 'Ninguno';

                const statusIcon = (enabled) => enabled ? DISCO_ICONS.SUCCESS : DISCO_ICONS.ERROR;
                const statusText = (enabled) => enabled ? 'Activado' : 'Desactivado';

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`${DISCO_ICONS.INFO} Configuración de Server Logs`)
                    .addFields(
                        { name: `${DISCO_ICONS.POINT} Canal de Logs`, value: logChannel, inline: false },
                        { name: `${statusIcon(config.logRoleChanges)} Cambios de Rol`, value: statusText(config.logRoleChanges), inline: true },
                        { name: `${statusIcon(config.logNickChanges)} Cambios de Nick`, value: statusText(config.logNickChanges), inline: true },
                        { name: `${statusIcon(config.logChannelChanges)} Cambios de Canal`, value: statusText(config.logChannelChanges), inline: true },
                        { name: `${statusIcon(config.logMessageDelete)} Msgs Eliminados`, value: statusText(config.logMessageDelete), inline: true },
                        { name: `${statusIcon(config.logMessageEdit)} Msgs Editados`, value: statusText(config.logMessageEdit), inline: true },
                        { name: `${statusIcon(config.logBans)} Bans/Unbans`, value: statusText(config.logBans), inline: true },
                        { name: `${statusIcon(config.logTimeouts)} Timeouts`, value: statusText(config.logTimeouts), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: `${DISCO_ICONS.ERROR} Canales Ignorados`, value: ignoredList, inline: false }
                    )
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};
