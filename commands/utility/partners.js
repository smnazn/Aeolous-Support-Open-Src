const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('partners')
        .setDescription('Configura el canal de alianzas')
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Establecer el canal de alianzas')
            .addChannelOption(o => o.setName('channel').setDescription('Canal de alianzas').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Rol a mencionar').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remover el canal de alianzas'))
        .addSubcommand(sub => sub.setName('status').setDescription('Ver el estado actual'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (sub) {
            case 'set': {
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');
                await setGuildConfig(guildId, 'partnersChannelId', channel.id);
                await setGuildConfig(guildId, 'partnersRoleId', role.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de alianzas configurado:**\n${DISCO_ICONS.POINT} Canal: ${channel}\n${DISCO_ICONS.POINT} Rol: ${role}\n\nCuando alguien envíe una invitación aquí, se mencionará el rol.`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'remove': {
                await setGuildConfig(guildId, 'partnersChannelId', null);
                await setGuildConfig(guildId, 'partnersRoleId', null);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de alianzas removido.**`)
                    .setColor(0x2B2D31);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case 'status': {
                const config = await getGuildConfig(guildId);
                if (config.partnersChannelId && config.partnersRoleId) {
                    const embed = new EmbedBuilder()
                        .setTitle(`${DISCO_ICONS.LINK} Estado de Alianzas`)
                        .setDescription(`${DISCO_ICONS.CHECKMARK} **Activo**\n${DISCO_ICONS.POINT} Canal: <#${config.partnersChannelId}>\n${DISCO_ICONS.POINT} Rol: <@&${config.partnersRoleId}>`)
                        .setColor(0x2B2D31);
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} No hay un canal de alianzas configurado.\nUsa \`/partners set\` o \`/setup partners\` para configurarlo.`)
                        .setColor(0x2B2D31);
                    await interaction.reply({ embeds: [embed] });
                }
                break;
            }
        }
    },

    async messageRun(message, args) {
        const sub = args[0]?.toLowerCase();
        const guildId = message.guild.id;

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return;
        }

        if (!sub || !['set', 'remove', 'status'].includes(sub)) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.LINK} Sistema de Alianzas`)
                .setDescription(`**Uso:**\n\`.partners set #canal @rol\` - Establecer canal y rol\n\`.partners remove\` - Remover configuración\n\`.partners status\` - Ver estado\n\n${DISCO_ICONS.POINT} También puedes usar \`/partners\` o \`/setup partners\``)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        switch (sub) {
            case 'set': {
                const channel = message.mentions.channels.first();
                const role = message.mentions.roles.first();
                if (!channel || !role) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} Debes mencionar un canal y un rol.\n**Uso:** \`.partners set #canal @rol\``)
                        .setColor(0x2B2D31);
                    return message.reply({ embeds: [embed] });
                }
                await setGuildConfig(guildId, 'partnersChannelId', channel.id);
                await setGuildConfig(guildId, 'partnersRoleId', role.id);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de alianzas configurado:**\n${DISCO_ICONS.POINT} Canal: ${channel}\n${DISCO_ICONS.POINT} Rol: ${role}`)
                    .setColor(0x2B2D31);
                await message.reply({ embeds: [embed] });
                break;
            }
            case 'remove': {
                await setGuildConfig(guildId, 'partnersChannelId', null);
                await setGuildConfig(guildId, 'partnersRoleId', null);
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CHECKMARK} **Canal de alianzas removido.**`)
                    .setColor(0x2B2D31);
                await message.reply({ embeds: [embed] });
                break;
            }
            case 'status': {
                const config = await getGuildConfig(guildId);
                if (config.partnersChannelId && config.partnersRoleId) {
                    const embed = new EmbedBuilder()
                        .setTitle(`${DISCO_ICONS.LINK} Estado de Alianzas`)
                        .setDescription(`${DISCO_ICONS.CHECKMARK} **Activo**\n${DISCO_ICONS.POINT} Canal: <#${config.partnersChannelId}>\n${DISCO_ICONS.POINT} Rol: <@&${config.partnersRoleId}>`)
                        .setColor(0x2B2D31);
                    await message.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.WARNING} No hay un canal de alianzas configurado.\nUsa \`.partners set #canal @rol\` para configurarlo.`)
                        .setColor(0x2B2D31);
                    await message.reply({ embeds: [embed] });
                }
                break;
            }
        }
    }
};
