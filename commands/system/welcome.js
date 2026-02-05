const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const WelcomeConfig = require('../../models/WelcomeConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configura los mensajes de bienvenida')
        .addSubcommand(sub => sub
            .setName('channel')
            .setDescription('Establecer el canal de bienvenida')
            .addChannelOption(o => o.setName('channel').setDescription('Canal para mensajes de bienvenida').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('message')
            .setDescription('Establecer el mensaje de bienvenida')
            .addStringOption(o => o.setName('text').setDescription('Mensaje (usa {user}, {username}, {server}, {membercount})').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('enable')
            .setDescription('Activar mensajes de bienvenida'))
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Desactivar mensajes de bienvenida'))
        .addSubcommand(sub => sub
            .setName('test')
            .setDescription('Probar el mensaje de bienvenida'))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Ver la configuración actual'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (sub) {
            case 'channel': {
                const channel = interaction.options.getChannel('channel');
                await WelcomeConfig.findOneAndUpdate(
                    { guildId },
                    { channelId: channel.id, enabled: true },
                    { upsert: true }
                );
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de bienvenida:** ${channel}`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'message': {
                const text = interaction.options.getString('text');
                const config = await WelcomeConfig.findOne({ guildId });
                if (!config) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} Primero configura el canal con \`/welcome channel\``)
                        .setColor(0x2B2D31);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                config.message = text;
                await config.save();
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Mensaje de bienvenida actualizado:**\n\`\`\`${text}\`\`\``)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'enable': {
                await WelcomeConfig.findOneAndUpdate({ guildId }, { enabled: true });
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Mensajes de bienvenida activados.**`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'disable': {
                await WelcomeConfig.findOneAndUpdate({ guildId }, { enabled: false });
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Mensajes de bienvenida desactivados.**`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'test': {
                const config = await WelcomeConfig.findOne({ guildId });
                if (!config || !config.channelId) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} No hay configuración de bienvenida.`)
                        .setColor(0x2B2D31);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const channel = interaction.guild.channels.cache.get(config.channelId);
                if (channel) {
                    const guild = interaction.guild;
                    const member = interaction.member;

                    // Get custom message or use default
                    let customMessage = config.message || 'Welcome to {server}! We\'re glad to have you here.';
                    customMessage = customMessage
                        .replace(/{user}/g, member.toString())
                        .replace(/{username}/g, interaction.user.username)
                        .replace(/{tag}/g, interaction.user.tag)
                        .replace(/{server}/g, guild.name)
                        .replace(/{membercount}/g, guild.memberCount.toString());

                    // Create welcome embed with custom message
                    const welcomeEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle(`Welcome to ${guild.name}!`)
                        .setDescription(`${DISCO_ICONS.POINT} ${customMessage}\n\n${DISCO_ICONS.POINT} You are member **#${guild.memberCount}**`)
                        .setThumbnail(interaction.user.displayAvatarURL({ size: 256, dynamic: true }))
                        .setFooter({
                            text: `${guild.name} • ${new Date().toLocaleDateString()}`,
                            iconURL: guild.iconURL()
                        })
                        .setTimestamp();

                    await channel.send({
                        content: `${DISCO_ICONS.SUCCESS} Welcome ${member}!`,
                        embeds: [welcomeEmbed]
                    });

                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.CHECKMARK} **Mensaje de prueba enviado a** ${channel}`)
                        .setColor(0x2B2D31);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} No se encontró el canal configurado.`)
                        .setColor(0x2B2D31);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
                break;
            }
            case 'view': {
                const config = await WelcomeConfig.findOne({ guildId });
                if (!config) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} No hay configuración de bienvenida.`)
                        .setColor(0x2B2D31);
                    return interaction.reply({ embeds: [embed] });
                }
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} Configuración de Bienvenida`)
                    .setDescription(
                        `${DISCO_ICONS.POINT} **Estado:** ${config.enabled ? '`Activo`' : '`Desactivado`'}\n` +
                        `${DISCO_ICONS.POINT} **Canal:** ${config.channelId ? `<#${config.channelId}>` : 'No configurado'}\n` +
                        `${DISCO_ICONS.POINT} **Mensaje:**\n\`\`\`${config.message || 'Bienvenido {user} al servidor!'}\`\`\`\n` +
                        `**Placeholders disponibles:**\n` +
                        `\`{user}\` - Mención del usuario\n` +
                        `\`{username}\` - Nombre de usuario\n` +
                        `\`{tag}\` - Usuario#0000\n` +
                        `\`{server}\` - Nombre del servidor\n` +
                        `\`{membercount}\` - Cantidad de miembros`
                    )
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} Welcome Configuration`)
            .setDescription(`Usa los comandos slash para configurar:\n\n${DISCO_ICONS.POINT} \`/welcome channel #canal\` - Canal de bienvenida\n${DISCO_ICONS.POINT} \`/welcome message <texto>\` - Mensaje personalizado\n${DISCO_ICONS.POINT} \`/welcome enable/disable\` - Activar/desactivar\n${DISCO_ICONS.POINT} \`/welcome test\` - Probar mensaje\n${DISCO_ICONS.POINT} \`/welcome view\` - Ver configuración`)
            .setColor(0x2B2D31);
        await message.reply({ embeds: [embed] });
    }
};
