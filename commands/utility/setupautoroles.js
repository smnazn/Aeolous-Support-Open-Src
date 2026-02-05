const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const ReactionRole = require('../../models/ReactionRole');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Create and manage reaction role panels')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new reaction role panel'))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a role to an existing message')
                .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for this role').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('Description for this role')))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a role from a message')
                .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to remove').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all reaction role panels'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    aliases: ['rr', 'setupautoroles'],

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            await this.handleCreate(interaction);
        } else if (sub === 'add') {
            await this.handleAdd(interaction);
        } else if (sub === 'remove') {
            await this.handleRemove(interaction);
        } else if (sub === 'list') {
            await this.handleList(interaction);
        }
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [createErrorEmbed('Necesitas permisos de Administrador.')] });
        }

        const sub = args[0]?.toLowerCase();

        if (!sub || sub === 'help') {
            const embed = new EmbedBuilder()
                .setDescription(
                    `<:information:1448485880623927468> **Reaction Roles**\n\n` +
                    `<a:15136blackdot:1448143887699804252> \`.rr create\` - Crear panel interactivo\n` +
                    `<a:15136blackdot:1448143887699804252> \`.rr add <msgId> @role <emoji> [desc]\` - Agregar rol\n` +
                    `<a:15136blackdot:1448143887699804252> \`.rr remove <msgId> <emoji>\` - Quitar rol\n` +
                    `<a:15136blackdot:1448143887699804252> \`.rr list\` - Ver todos los paneles`
                )
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        if (sub === 'create') {
            await this.handleCreate(message);
        } else if (sub === 'add') {
            const msgId = args[1];
            const role = message.mentions.roles.first();
            const emoji = args[3];
            const desc = args.slice(4).join(' ');

            if (!msgId || !role || !emoji) {
                return message.reply({ embeds: [createErrorEmbed('Uso: `.rr add <messageId> @role <emoji> [descripción]`')] });
            }

            await this.handleAddMessage(message, msgId, role, emoji, desc);
        } else if (sub === 'remove') {
            const msgId = args[1];
            const emoji = args[2];

            if (!msgId || !emoji) {
                return message.reply({ embeds: [createErrorEmbed('Uso: `.rr remove <messageId> <emoji>`')] });
            }

            await this.handleRemoveMessage(message, msgId, emoji);
        } else if (sub === 'list') {
            await this.handleList(message);
        }
    },

    async handleCreate(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;
        const author = source.author || source.user;

        // Step 1: Ask for title
        const askEmbed = new EmbedBuilder()
            .setDescription(
                `<:information:1448485880623927468> **Crear Panel de Reaction Roles**\n\n` +
                `Responde con el **título** para tu panel.\n` +
                `*Ejemplo: 🎮 Roles de Notificaciones*\n\n` +
                `Escribe \`cancelar\` para cancelar.`
            )
            .setColor(0x2B2D31);

        await reply({ embeds: [askEmbed] });

        const filter = m => m.author.id === author.id;

        try {
            // Get title
            const titleCollected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const title = titleCollected.first().content;

            if (title.toLowerCase() === 'cancelar') {
                return channel.send({ embeds: [createErrorEmbed('Cancelado.')] });
            }

            await titleCollected.first().delete().catch(() => { });

            // Step 2: Ask for description
            const descEmbed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Título:** ${title}\n\n` +
                    `Ahora escribe la **descripción** del panel.\n` +
                    `*Ejemplo: Selecciona los roles que deseas obtener*`
                )
                .setColor(0x2B2D31);

            const descMsg = await channel.send({ embeds: [descEmbed] });

            const descCollected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const description = descCollected.first().content;

            if (description.toLowerCase() === 'cancelar') {
                return channel.send({ embeds: [createErrorEmbed('Cancelado.')] });
            }

            await descCollected.first().delete().catch(() => { });
            await descMsg.delete().catch(() => { });

            // Step 3: Create the panel
            const panelEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description + '\n\n*Usa `.rr add <msgId> @role <emoji> [desc]` para agregar roles*')
                .setColor(0x2B2D31)
                .setFooter({ text: source.guild.name, iconURL: source.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            const panelMsg = await channel.send({ embeds: [panelEmbed] });

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Panel Creado**\n\n` +
                    `<a:15136blackdot:1448143887699804252> **Message ID:** \`${panelMsg.id}\`\n\n` +
                    `Ahora usa:\n` +
                    `\`.rr add ${panelMsg.id} @role <emoji> [descripción]\`\n` +
                    `para agregar roles al panel.`
                )
                .setColor(0x2B2D31);

            await channel.send({ embeds: [successEmbed] });

        } catch (error) {
            if (error.message === 'time') {
                return channel.send({ embeds: [createErrorEmbed('Tiempo agotado. Intenta de nuevo.')] });
            }
            console.error('Error creating reaction role panel:', error);
            return channel.send({ embeds: [createErrorEmbed('Ocurrió un error.')] });
        }
    },

    async handleAdd(interaction) {
        const messageId = interaction.options.getString('message_id');
        const role = interaction.options.getRole('role');
        const emoji = interaction.options.getString('emoji');
        const description = interaction.options.getString('description') || '';

        await this.handleAddMessage(interaction, messageId, role, emoji, description);
    },

    async handleAddMessage(source, messageId, role, emojiInput, description) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            // Find the message
            const msg = await source.channel.messages.fetch(messageId);
            if (!msg) {
                return reply({ embeds: [createErrorEmbed('Mensaje no encontrado en este canal.')] });
            }

            // Parse emoji
            const emojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
            const emojiId = emojiMatch ? emojiMatch[2] : emojiInput;
            const emojiDisplay = emojiMatch ? emojiInput : emojiInput;

            // Add reaction
            await msg.react(emojiId);

            // Save to DB
            await ReactionRole.findOneAndUpdate(
                { messageId: msg.id, emoji: emojiId },
                {
                    guildId: source.guild.id,
                    channelId: source.channel.id,
                    roleId: role.id,
                    description: description
                },
                { upsert: true, new: true }
            );

            // Update embed
            const embed = msg.embeds[0];
            if (embed) {
                const newDesc = embed.description.replace(
                    '*Usa `.rr add <msgId> @role <emoji> [desc]` para agregar roles*',
                    ''
                );

                const roleEntry = `${emojiDisplay} ${role}${description ? ` - *${description}*` : ''}`;
                const updatedEmbed = EmbedBuilder.from(embed)
                    .setDescription(newDesc + '\n' + roleEntry);

                await msg.edit({ embeds: [updatedEmbed] });
            }

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Rol Agregado**\n\n` +
                    `<a:15136blackdot:1448143887699804252> **Rol:** ${role}\n` +
                    `<a:15136blackdot:1448143887699804252> **Emoji:** ${emojiDisplay}`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error adding reaction role:', error);
            await reply({ embeds: [createErrorEmbed('Error al agregar rol. Verifica el ID del mensaje.')] });
        }
    },

    async handleRemove(interaction) {
        const messageId = interaction.options.getString('message_id');
        const emoji = interaction.options.getString('emoji');

        await this.handleRemoveMessage(interaction, messageId, emoji);
    },

    async handleRemoveMessage(source, messageId, emojiInput) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const emojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
            const emojiId = emojiMatch ? emojiMatch[2] : emojiInput;

            await ReactionRole.deleteOne({ messageId, emoji: emojiId });

            const msg = await source.channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
                const reaction = msg.reactions.cache.find(r => r.emoji.id === emojiId || r.emoji.name === emojiId);
                if (reaction) await reaction.remove().catch(() => { });
            }

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Rol Removido**\n\n` +
                    `El rol asociado a ${emojiInput} ha sido eliminado.`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error removing reaction role:', error);
            await reply({ embeds: [createErrorEmbed('Error al remover rol.')] });
        }
    },

    async handleList(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const reactionRoles = await ReactionRole.find({ guildId: source.guild.id });

            if (reactionRoles.length === 0) {
                return reply({ embeds: [createSuccessEmbed('Reaction Roles', 'No hay reaction roles configurados.')] });
            }

            // Group by messageId
            const grouped = {};
            for (const rr of reactionRoles) {
                if (!grouped[rr.messageId]) {
                    grouped[rr.messageId] = [];
                }
                grouped[rr.messageId].push(rr);
            }

            let description = '';
            for (const [msgId, roles] of Object.entries(grouped)) {
                description += `**Message ID:** \`${msgId}\`\n`;
                for (const rr of roles) {
                    description += `<a:15136blackdot:1448143887699804252> <@&${rr.roleId}>\n`;
                }
                description += '\n';
            }

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:information:1448485880623927468> **Reaction Roles**\n\n${description}`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing reaction roles:', error);
            await reply({ embeds: [createErrorEmbed('Error al listar.')] });
        }
    }
};
