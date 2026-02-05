const { SlashCommandBuilder, AuditLogEvent, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('audit')
        .setDescription('Muestra los registros de auditoría del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('Filtrar por usuario').setRequired(false))
        .addStringOption(option => option.setName('tipo').setDescription('Tipo de acción').setRequired(false)
            .addChoices(
                { name: 'Ban', value: 'ban' },
                { name: 'Kick', value: 'kick' },
                { name: 'Server', value: 'server' },
                { name: 'Canales', value: 'channels' }
            ))
        .addIntegerOption(option => option.setName('limite').setDescription('Cantidad de registros a mostrar (max 100)').setMinValue(1).setMaxValue(100).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return interaction.reply({ content: 'No tienes permiso para ver los registros de auditoría.', ephemeral: true });
        }

        const userId = interaction.options.getUser('usuario')?.id;
        const typeKey = interaction.options.getString('tipo');
        const limit = interaction.options.getInteger('limite') || 10;

        await interaction.deferReply({ ephemeral: true });

        const typeMap = {
            ban: AuditLogEvent.MemberBanAdd,
            kick: AuditLogEvent.MemberKick,
            server: 'server',
            channels: 'channels',
        };
        const auditType = typeKey ? typeMap[typeKey] : undefined;

        const serverActions = new Set([
            AuditLogEvent.ChannelCreate, AuditLogEvent.ChannelDelete, AuditLogEvent.ChannelUpdate,
            AuditLogEvent.RoleCreate, AuditLogEvent.RoleDelete, AuditLogEvent.RoleUpdate,
            AuditLogEvent.GuildUpdate, AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookDelete,
            AuditLogEvent.WebhookUpdate, AuditLogEvent.EmojiCreate, AuditLogEvent.EmojiDelete,
            AuditLogEvent.EmojiUpdate, AuditLogEvent.StickerCreate, AuditLogEvent.StickerDelete,
            AuditLogEvent.StickerUpdate, AuditLogEvent.ChannelOverwriteCreate, AuditLogEvent.ChannelOverwriteDelete,
            AuditLogEvent.ChannelOverwriteUpdate,
        ]);

        const channelActions = new Set([
            AuditLogEvent.ChannelCreate, AuditLogEvent.ChannelDelete, AuditLogEvent.ChannelUpdate,
            AuditLogEvent.ChannelOverwriteCreate, AuditLogEvent.ChannelOverwriteDelete, AuditLogEvent.ChannelOverwriteUpdate,
        ]);

        try {
            const opts = { limit: 100 };
            if (typeof auditType === 'number') opts.type = auditType;

            const logs = await interaction.guild.fetchAuditLogs(opts);
            let entries = Array.from(logs.entries.values());

            if (typeKey === 'server') {
                entries = entries.filter(e => serverActions.has(e.action));
            } else if (typeKey === 'channels') {
                entries = entries.filter(e => channelActions.has(e.action));
            }

            if (userId) {
                entries = entries.filter(e => (e.executorId === userId) || (e.targetId === userId));
            }

            entries = entries.slice(0, limit);

            if (entries.length === 0) {
                return interaction.editReply('No se encontraron registros.');
            }

            const lines = entries.map((entry, idx) => {
                const ts = Math.floor(entry.createdTimestamp / 1000);
                const executor = entry.executor ? entry.executor.tag : 'Desconocido';
                let target = 'N/A';
                if (entry.target) {
                    if (entry.target.tag) target = entry.target.tag;
                    else if (entry.target.username) target = entry.target.username;
                    else if (entry.target.name) target = entry.target.name;
                    else target = String(entry.target.id || 'N/A');
                }
                const reason = entry.reason ? ` | ${entry.reason}` : '';
                return `> ${idx + 1}. ${executor} -> **${target}**${reason} | <t:${ts}:R>`;
            });

            const embed = new EmbedBuilder()
                .setTitle('Audit Log')
                .setColor(0x2F3136)
                .setDescription(lines.join('\n').substring(0, 4096));

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await interaction.editReply(`Error al obtener logs: ${err.message}`);
        }
    },
};











