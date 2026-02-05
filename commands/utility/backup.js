const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Backup = require('../../models/Backup');
const { createSuccessEmbed, createErrorEmbed, ICONS } = require('../../utils/helpers');
const { DISCO_ICONS } = require('../../utils/icons');
const crypto = require('crypto');

// Generate short unique ID
function generateBackupId() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Sistema de backup del servidor')
        .addSubcommand(sub => sub.setName('create').setDescription('Crear un backup del servidor'))
        .addSubcommand(sub => sub.setName('list').setDescription('Ver lista de backups'))
        .addSubcommand(sub => sub.setName('load').setDescription('Restaurar un backup')
            .addStringOption(o => o.setName('id').setDescription('ID del backup').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const backupId = interaction.options.getString('id');
        await this.handleBackup(interaction, sub, backupId);
    },

    async messageRun(message, args) {
        const sub = args[0]?.toLowerCase();
        const backupId = args[1];

        if (!sub || !['create', 'list', 'load'].includes(sub)) {
            const embed = new EmbedBuilder()
                .setTitle(`${ICONS.LOADING} Sistema de Backup`)
                .setDescription(`> **Uso:**
> \`.backup create\` - Crear backup
> \`.backup list\` - Ver backups
> \`.backup load <ID>\` - Restaurar backup

${ICONS.POINT} Solo el dueño del servidor o el dueño del bot pueden usar esto.`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        await this.handleBackup(message, sub, backupId);
    },

    async handleBackup(source, sub, backupId) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const executor = source.user || source.author;

        // Permission check: Bot Owner OR Guild Owner only
        const isOwner = executor.id === process.env.OWNER_ID;
        const isGuildOwner = executor.id === source.guild.ownerId;

        if (!isOwner && !isGuildOwner) {
            return reply({ embeds: [createErrorEmbed('Solo el dueño del servidor o el dueño del bot pueden usar este comando.')], ephemeral: true });
        }

        switch (sub) {
            case 'create':
                await this.createBackup(source, executor, false);
                break;
            case 'list':
                await this.listBackups(source);
                break;
            case 'load':
                if (!backupId) {
                    return reply({ embeds: [createErrorEmbed('Debes especificar el ID del backup.')], ephemeral: true });
                }
                await this.loadBackup(source, backupId);
                break;
        }
    },

    async createBackup(source, executor, isAutomatic = false) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const guild = source.guild;

        try {
            // Show loading message
            const loadingEmbed = new EmbedBuilder()
                .setDescription(`${ICONS.LOADING} Creando backup del servidor...`)
                .setColor(0x2B2D31);
            const loadingMsg = await reply({ embeds: [loadingEmbed], fetchReply: true });

            // Collect roles (exclude @everyone and managed roles)
            const roles = [...guild.roles.cache
                .filter(r => r.id !== guild.id && !r.managed)
                .sort((a, b) => b.position - a.position)
                .values()]
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    position: r.position,
                    permissions: r.permissions.bitfield.toString(),
                    mentionable: r.mentionable,
                    managed: r.managed
                }));

            // Collect categories
            const categories = [...guild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position)
                .values()]
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    position: c.position,
                    permissionOverwrites: [...c.permissionOverwrites.cache.values()].map(p => ({
                        id: p.id,
                        overwriteType: p.type,
                        allow: p.allow.bitfield.toString(),
                        deny: p.deny.bitfield.toString()
                    }))
                }));

            // Collect channels (exclude threads and other non-standard types)
            const validChannelTypes = [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum];
            const channels = [...guild.channels.cache
                .filter(c => c.type !== ChannelType.GuildCategory && validChannelTypes.includes(c.type))
                .sort((a, b) => a.position - b.position)
                .values()]
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    channelType: c.type,
                    parentId: c.parentId,
                    position: c.position,
                    topic: c.topic || null,
                    nsfw: c.nsfw || false,
                    rateLimitPerUser: c.rateLimitPerUser || 0,
                    bitrate: c.bitrate || null,
                    userLimit: c.userLimit || null,
                    permissionOverwrites: [...(c.permissionOverwrites?.cache?.values() || [])].map(p => ({
                        id: p.id,
                        overwriteType: p.type,
                        allow: p.allow.bitfield.toString(),
                        deny: p.deny.bitfield.toString()
                    }))
                }));

            // Create backup document
            const backupId = generateBackupId();
            const backup = new Backup({
                backupId,
                guildId: guild.id,
                guildName: guild.name,
                createdBy: executor.id,
                isAutomatic,
                roles,
                categories,
                channels
            });

            await backup.save();

            // Delete old automatic backups (keep last 5)
            const autoBackups = await Backup.find({ guildId: guild.id, isAutomatic: true }).sort({ createdAt: -1 });
            if (autoBackups.length > 5) {
                const toDelete = autoBackups.slice(5);
                await Backup.deleteMany({ _id: { $in: toDelete.map(b => b._id) } });
            }

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Backup Creado**\n` +
                    `<a:15136blackdot:1448143887699804252> **ID:** \`${backupId}\`\n` +
                    `<a:15136blackdot:1448143887699804252> **Servidor:** ${guild.name}\n` +
                    `<a:15136blackdot:1448143887699804252> **Roles:** ${roles.length}\n` +
                    `<a:15136blackdot:1448143887699804252> **Categorías:** ${categories.length}\n` +
                    `<a:15136blackdot:1448143887699804252> **Canales:** ${channels.length}\n` +
                    `<a:15136blackdot:1448143887699804252> **Tipo:** ${isAutomatic ? 'Automático' : 'Manual'}\n\n` +
                    `<:information:1448485880623927468> Usa \`.backup load ${backupId}\` para restaurar.`
                )
                .setColor(0x2B2D31);

            if (loadingMsg.edit) {
                await loadingMsg.edit({ embeds: [successEmbed] });
            } else {
                await reply({ embeds: [successEmbed] });
            }

            return backupId;

        } catch (error) {
            console.error('Error creating backup:', error);
            await reply({ embeds: [createErrorEmbed('Error al crear el backup.')], ephemeral: true });
            return null;
        }
    },

    async listBackups(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const guild = source.guild;

        try {
            const backups = await Backup.find({ guildId: guild.id }).sort({ createdAt: -1 }).limit(10);

            if (backups.length === 0) {
                return reply({ embeds: [createErrorEmbed('No hay backups para este servidor.')], ephemeral: true });
            }

            const backupList = backups.map((b, i) => {
                const date = `<t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`;
                const type = b.isAutomatic ? DISCO_ICONS.AUTO : DISCO_ICONS.SAVED;
                return `${type} \`${b.backupId}\` - ${date} - ${b.roles.length}R/${b.channels.length}C`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.SAVED} Backups del Servidor`)
                .setDescription(`**Total:** ${backups.length} backup(s)\n\n${backupList}\n\n${ICONS.POINT} ${DISCO_ICONS.SAVED} = Manual | ${DISCO_ICONS.AUTO} = Automático`)
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing backups:', error);
            await reply({ embeds: [createErrorEmbed('Error al listar backups.')], ephemeral: true });
        }
    },

    async loadBackup(source, backupId) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const guild = source.guild;
        const executor = source.user || source.author;

        try {
            // First try to find backup from this server, then from any server
            let backup = await Backup.findOne({ backupId: backupId.toUpperCase(), guildId: guild.id });

            if (!backup) {
                // Try to find backup from any server (cross-server restore)
                backup = await Backup.findOne({ backupId: backupId.toUpperCase() });
            }

            if (!backup) {
                return reply({ embeds: [createErrorEmbed('Backup no encontrado.')], ephemeral: true });
            }

            const isFromOtherServer = backup.guildId !== guild.id;

            // Confirmation
            const crossServerWarning = isFromOtherServer
                ? `\n> <:warning:1448832070628671488> **Este backup es de otro servidor:** ${backup.guildName}\n`
                : '';

            const confirmEmbed = new EmbedBuilder()
                .setDescription(`<:warning:1448832070628671488> **Confirmar Restauración**\n**ADVERTENCIA:** Esta acción eliminará TODOS los canales y roles actuales del servidor y los reemplazará con el backup.
${crossServerWarning}
<a:15136blackdot:1448143887699804252> **Backup ID:** \`${backupId}\`
<a:15136blackdot:1448143887699804252> **Servidor origen:** ${backup.guildName}
<a:15136blackdot:1448143887699804252> **Fecha:** <t:${Math.floor(backup.createdAt.getTime() / 1000)}:F>
<a:15136blackdot:1448143887699804252> **Roles:** ${backup.roles.length} | **Canales:** ${backup.channels.length}

<:information:1448485880623927468> **Escribe \`CONFIRMAR\` en los próximos 30 segundos para continuar.**`)
                .setColor(isFromOtherServer ? 0xED4245 : 0x2B2D31);

            await reply({ embeds: [confirmEmbed] });

            // Wait for confirmation
            const filter = m => m.author.id === executor.id && m.content.toUpperCase() === 'CONFIRMAR';
            const collected = await source.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);

            if (!collected || collected.size === 0) {
                return reply({ embeds: [createErrorEmbed('Restauración cancelada (tiempo agotado).')], ephemeral: true });
            }

            // Start restoration
            const loadingEmbed = new EmbedBuilder()
                .setDescription(`<:reminder:1448489924083843092> Restaurando backup... Esto puede tomar varios minutos.`)
                .setColor(0x2B2D31);
            const statusMsg = await source.channel.send({ embeds: [loadingEmbed] });

            // Map old role IDs to new role IDs
            const roleIdMap = new Map();

            // Delete existing roles (except @everyone and managed)
            const existingRoles = guild.roles.cache.filter(r => r.id !== guild.id && !r.managed && r.position < guild.members.me.roles.highest.position);
            for (const role of existingRoles.values()) {
                try {
                    await role.delete('Backup restore');
                } catch (e) { }
            }

            // Create roles from backup (highest position first = top roles first)
            const sortedRoles = [...backup.roles].sort((a, b) => b.position - a.position);
            for (const roleData of sortedRoles) {
                try {
                    const newRole = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        permissions: BigInt(roleData.permissions),
                        mentionable: roleData.mentionable,
                        reason: 'Backup restore'
                    });
                    roleIdMap.set(roleData.id, newRole.id);
                    await new Promise(r => setTimeout(r, 300)); // Delay to avoid rate limit
                } catch (e) {
                    console.error('Error creating role:', e);
                }
            }

            // Delete existing channels
            const existingChannels = guild.channels.cache.filter(c => c.deletable);
            for (const channel of existingChannels.values()) {
                try {
                    await channel.delete('Backup restore');
                    await new Promise(r => setTimeout(r, 200)); // Delay
                } catch (e) { }
            }

            // Map old category IDs to new category IDs
            const categoryIdMap = new Map();

            // Create categories first
            for (const catData of backup.categories) {
                try {
                    // Filter valid permission overwrites only
                    const permOverwrites = catData.permissionOverwrites
                        .filter(p => {
                            const newId = roleIdMap.get(p.id) || p.id;
                            // Only include if it's @everyone or a role we created
                            return newId === guild.id || roleIdMap.has(p.id) || guild.roles.cache.has(newId);
                        })
                        .map(p => ({
                            id: roleIdMap.get(p.id) || p.id,
                            allow: BigInt(p.allow),
                            deny: BigInt(p.deny)
                        }));

                    const newCat = await guild.channels.create({
                        name: catData.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: permOverwrites,
                        reason: 'Backup restore'
                    });
                    categoryIdMap.set(catData.id, newCat.id);
                    await new Promise(r => setTimeout(r, 500)); // Delay for categories
                } catch (e) {
                    console.error('Error creating category:', e);
                }
            }

            // Create channels
            for (const chData of backup.channels) {
                try {
                    // Filter valid permission overwrites only
                    const permOverwrites = chData.permissionOverwrites
                        .filter(p => {
                            const newId = roleIdMap.get(p.id) || p.id;
                            // Only include if it's @everyone or a role we created
                            return newId === guild.id || roleIdMap.has(p.id) || guild.roles.cache.has(newId);
                        })
                        .map(p => ({
                            id: roleIdMap.get(p.id) || p.id,
                            allow: BigInt(p.allow),
                            deny: BigInt(p.deny)
                        }));

                    const options = {
                        name: chData.name,
                        type: chData.channelType,
                        parent: categoryIdMap.get(chData.parentId) || null,
                        permissionOverwrites: permOverwrites,
                        reason: 'Backup restore'
                    };

                    if (chData.channelType === ChannelType.GuildText) {
                        options.topic = chData.topic;
                        options.nsfw = chData.nsfw;
                        options.rateLimitPerUser = chData.rateLimitPerUser;
                    } else if (chData.channelType === ChannelType.GuildVoice) {
                        options.bitrate = chData.bitrate;
                        options.userLimit = chData.userLimit;
                    }

                    await guild.channels.create(options);
                    await new Promise(r => setTimeout(r, 500)); // Delay between channels
                } catch (e) {
                    console.error('Error creating channel:', e);
                    await new Promise(r => setTimeout(r, 1000)); // Longer delay on error (rate limit)
                }
            }

            // Send success message to first available channel
            const firstChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (firstChannel) {
                const successEmbed = new EmbedBuilder()
                    .setDescription(
                        `<:checkmark:1448832045068583033> **Backup Restaurado**\n` +
                        `<a:15136blackdot:1448143887699804252> **Backup ID:** \`${backupId}\`\n` +
                        `<a:15136blackdot:1448143887699804252> **Restaurado por:** <@${executor.id}>\n` +
                        `<a:15136blackdot:1448143887699804252> **Roles creados:** ${backup.roles.length}\n` +
                        `<a:15136blackdot:1448143887699804252> **Canales creados:** ${backup.channels.length + backup.categories.length}\n\n` +
                        `<:information:1448485880623927468> El servidor ha sido restaurado al estado del backup.`
                    )
                    .setColor(0x2B2D31);
                await firstChannel.send({ embeds: [successEmbed] });
            }

        } catch (error) {
            console.error('Error loading backup:', error);
            try {
                await reply({ embeds: [createErrorEmbed('Error al restaurar el backup.')], ephemeral: true });
            } catch { }
        }
    }
};











