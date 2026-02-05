const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');
const Warning = require('../../models/Warning');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Sistema de advertencias')
        .addSubcommand(s => s.setName('add').setDescription('Advertir a un usuario')
            .addUserOption(o => o.setName('target').setDescription('El usuario').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Razón de la advertencia').setRequired(false)))
        .addSubcommand(s => s.setName('get').setDescription('Ver advertencias de un usuario')
            .addUserOption(o => o.setName('target').setDescription('El usuario').setRequired(true)))
        .addSubcommand(s => s.setName('del').setDescription('Eliminar la última advertencia de un usuario')
            .addUserOption(o => o.setName('target').setDescription('El usuario').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(interaction.user.id);
        if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [createErrorEmbed('No tienes permiso para moderar miembros.')], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target');

        if (sub === 'add') {
            const reason = interaction.options.getString('reason') || 'Sin razón especificada.';
            await this.handleWarn(interaction, target, reason);
        } else if (sub === 'get') {
            await this.handleWarnsList(interaction, target);
        } else if (sub === 'del') {
            await this.handleUnwarn(interaction, target);
        }
    },

    // Prefix commands compatibility
    async messageRun(message, args) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [createErrorEmbed('No tienes permiso para moderar miembros.')] });
        }

        let sub = 'add';
        if (args.length > 0) {
            if (['get', 'del'].includes(args[0].toLowerCase())) {
                sub = args[0].toLowerCase();
            }
        }

        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.WARNING} Sistema de Advertencias`)
                .setDescription(`> **Uso:**
> \`.warn <user> [reason]\` - Advertir
> \`.warn get <user>\` - Ver lista
> \`.warn del <user>\` - Eliminar la ÚLTIMA advertencia`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        if (sub === 'add') {
            const target = message.mentions.users.first();
            if (!target) return message.reply('Menciona a un usuario.');

            // Extract reason: everything after target.
            const targetIndex = args.findIndex(a => a.includes(target.id));
            const reason = args.slice(targetIndex + 1).join(' ') || 'Sin razón especificada.';
            await this.handleWarn(message, target, reason);

        } else if (sub === 'get') {
            const target = message.mentions.users.first();
            if (!target) return message.reply('Menciona a un usuario.');
            await this.handleWarnsList(message, target);

        } else if (sub === 'del') {
            const target = message.mentions.users.first();
            if (!target) return message.reply('Menciona al usuario para quitarle su última advertencia.');
            await this.handleUnwarn(message, target);
        }
    },

    async handleWarn(source, target, reason) {
        const executor = source.member;
        const targetMember = await source.guild.members.fetch(target.id).catch(() => null);

        const executorUser = source.user || source.author;
        if (executorUser.id !== process.env.OWNER_ID) {
            if (target.id === executorUser.id) {
                return this.replyError(source, 'No puedes advertirte a ti mismo.');
            }
            if (targetMember) {
                if (targetMember.roles.highest.position >= executor.roles.highest.position) {
                    return this.replyError(source, 'No puedes advertir a alguien con rol igual o superior.');
                }
            }
        }

        try {
            await Warning.create({
                guildId: source.guild.id,
                userId: target.id,
                reason: reason,
                moderatorId: executorUser.id,
                timestamp: Date.now()
            });

            const count = await Warning.countDocuments({ guildId: source.guild.id, userId: target.id });

            const embed = createSuccessEmbed(
                'Usuario Advertido',
                `> **Usuario:** ${target.tag}\n> **Advertencia #:** \`${count}\`\n> **Razón:** \`${reason}\`\n\n${ICONS.POINT} La advertencia ha sido registrada`
            ).setThumbnail(target.displayAvatarURL());

            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            await reply({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            this.replyError(source, 'Error al guardar la advertencia en base de datos.');
        }
    },

    async handleWarnsList(source, target) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const warnings = await Warning.find({ guildId: source.guild.id, userId: target.id }).sort({ timestamp: 1 });

            if (warnings.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} Lista de Advertencias`)
                    .setDescription(`> **Usuario:** ${target.tag}\n\n${DISCO_ICONS.POINT} Este usuario no tiene advertencias.`)
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed] });
            }

            const warningsText = await Promise.all(warnings.map(async (w, index) => {
                let staffMention = 'Staff Desconocido';
                try {
                    const staffMember = await source.guild.members.fetch(w.moderatorId);
                    staffMention = staffMember.user.tag;
                } catch { }
                return `\`${index + 1}.\` ${DISCO_ICONS.MEMBER} **Staff:** ${staffMention}\n> **ID:** \`${w._id}\`\n> **Razón:** ${w.reason}\n> **Fecha:** <t:${Math.floor(w.timestamp / 1000)}:R>`;
            }));

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.WARNING} Advertencias de ${target.tag}`)
                .setColor(0x2B2D31)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(warningsText.join('\n\n'));

            await reply({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            this.replyError(source, 'Error al obtener advertencias.');
        }
    },

    async handleUnwarn(source, target) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            // Remove listing sorting by timestamp descending (newest first)
            const removed = await Warning.findOneAndDelete({ guildId: source.guild.id, userId: target.id }, { sort: { timestamp: -1 } });

            if (removed) {
                const embed = createSuccessEmbed(
                    'Advertencia Eliminada',
                    `> Se eliminó la **última advertencia** de **${target.tag}**.\n> **ID:** \`${removed._id}\`\n> **Razón:** ${removed.reason}`
                );
                await reply({ embeds: [embed] });
            } else {
                const embed = createErrorEmbed('Este usuario no tiene advertencias para eliminar.');
                await reply({ embeds: [embed] });
            }
        } catch (e) {
            console.error(e);
            this.replyError(source, 'Error al eliminar la advertencia.');
        }
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};
