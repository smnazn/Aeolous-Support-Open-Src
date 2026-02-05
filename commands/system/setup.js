const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura el bot para este servidor')
        .addSubcommand(sub => sub
            .setName('staff')
            .setDescription('Configura el rol de staff')
            .addRoleOption(o => o.setName('role').setDescription('Rol de staff').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('partners')
            .setDescription('Configura el rol y canal de partners/alianzas')
            .addRoleOption(o => o.setName('role').setDescription('Rol a mencionar').setRequired(true))
            .addChannelOption(o => o.setName('channel').setDescription('Canal de alianzas').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('logs')
            .setDescription('Configura el canal de logs')
            .addChannelOption(o => o.setName('channel').setDescription('Canal de logs').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('tickets')
            .setDescription('Configura la categoría de tickets')
            .addChannelOption(o => o.setName('category').setDescription('Categoría para tickets').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Ver la configuración actual'))
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Resetear toda la configuración'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (sub) {
            case 'staff': {
                const role = interaction.options.getRole('role');
                await setGuildConfig(guildId, 'staffRoleId', role.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Staff role configurado:** ${role}`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'partners': {
                const role = interaction.options.getRole('role');
                const channel = interaction.options.getChannel('channel');
                await setGuildConfig(guildId, 'partnersRoleId', role.id);
                await setGuildConfig(guildId, 'partnersChannelId', channel.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Partners configurado:**\n${DISCO_ICONS.POINT} Rol: ${role}\n${DISCO_ICONS.POINT} Canal: ${channel}`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'logs': {
                const channel = interaction.options.getChannel('channel');
                await setGuildConfig(guildId, 'logChannelId', channel.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de logs configurado:** ${channel}`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'tickets': {
                const category = interaction.options.getChannel('category');
                if (category.type !== ChannelType.GuildCategory) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.CROSSMARK} Debes seleccionar una categoría, no un canal.`)
                        .setColor(0x2B2D31);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                await setGuildConfig(guildId, 'ticketCategoryId', category.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Categoría de tickets configurada:** ${category.name}`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'view': {
                const config = await getGuildConfig(guildId);
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} Configuración del Servidor`)
                    .setDescription(
                        `${DISCO_ICONS.POINT} **Staff Role:** ${config.staffRoleId ? `<@&${config.staffRoleId}>` : 'No configurado'}\n` +
                        `${DISCO_ICONS.POINT} **Partners Role:** ${config.partnersRoleId ? `<@&${config.partnersRoleId}>` : 'No configurado'}\n` +
                        `${DISCO_ICONS.POINT} **Partners Channel:** ${config.partnersChannelId ? `<#${config.partnersChannelId}>` : 'No configurado'}\n` +
                        `${DISCO_ICONS.POINT} **Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'No configurado'}\n` +
                        `${DISCO_ICONS.POINT} **Ticket Category:** ${config.ticketCategoryId ? `\`${config.ticketCategoryId}\`` : 'No configurado'}`
                    )
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'reset': {
                await setGuildConfig(guildId, 'staffRoleId', null);
                await setGuildConfig(guildId, 'partnersRoleId', null);
                await setGuildConfig(guildId, 'partnersChannelId', null);
                await setGuildConfig(guildId, 'logChannelId', null);
                await setGuildConfig(guildId, 'ticketCategoryId', null);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Configuración reseteada.**`)
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
            .setTitle(`${DISCO_ICONS.INFO} Setup`)
            .setDescription(`El comando de configuración solo está disponible como **slash command**.\n\nUsa \`/setup\` para configurar:\n${DISCO_ICONS.POINT} \`/setup staff\` - Rol de staff\n${DISCO_ICONS.POINT} \`/setup partners\` - Canal y rol de alianzas\n${DISCO_ICONS.POINT} \`/setup logs\` - Canal de logs\n${DISCO_ICONS.POINT} \`/setup tickets\` - Categoría de tickets\n${DISCO_ICONS.POINT} \`/setup view\` - Ver configuración\n${DISCO_ICONS.POINT} \`/setup reset\` - Resetear todo`)
            .setColor(0x2B2D31);
        await message.reply({ embeds: [embed] });
    }
};
