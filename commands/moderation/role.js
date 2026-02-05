const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Gestiona roles de usuarios')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Añade un rol a un usuario')
            .addUserOption(opt => opt
                .setName('usuario')
                .setDescription('Usuario al que añadir el rol')
                .setRequired(true)
            )
            .addRoleOption(opt => opt
                .setName('rol')
                .setDescription('Rol a añadir')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Quita un rol de un usuario')
            .addUserOption(opt => opt
                .setName('usuario')
                .setDescription('Usuario al que quitar el rol')
                .setRequired(true)
            )
            .addRoleOption(opt => opt
                .setName('rol')
                .setDescription('Rol a quitar')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('all')
            .setDescription('Añade un rol a todos los miembros del servidor')
            .addRoleOption(opt => opt
                .setName('rol')
                .setDescription('Rol a añadir a todos')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await this.handleRoleAdd(interaction);
        } else if (subcommand === 'remove') {
            await this.handleRoleRemove(interaction);
        } else if (subcommand === 'all') {
            await this.handleRoleAll(interaction);
        }
    },

    async messageRun(message, args) {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${DISCO_ICONS.INFO} Comandos de Rol`)
                .setDescription('`.role add @usuario @rol` - Añadir rol\n`.role remove @usuario @rol` - Quitar rol\n`.role all @rol` - Añadir rol a todos\n`.role create <nombre> [color]` - Crear un rol nuevo');
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        if (subcommand === 'add' || subcommand === 'remove') {
            const user = message.mentions.members.first();
            const role = message.mentions.roles.first();

            if (!user || !role) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription(`${DISCO_ICONS.ERROR} Uso: \`.role ${subcommand} @usuario @rol\``)]
                });
            }

            if (subcommand === 'add') {
                await this.handleRoleAdd(message, user, role);
            } else {
                await this.handleRoleRemove(message, user, role);
            }
        } else if (subcommand === 'all') {
            const role = message.mentions.roles.first();
            if (!role) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription(`${DISCO_ICONS.ERROR} Uso: \`.role all @rol\``)]
                });
            }
            await this.handleRoleAll(message, role);
        } else if (subcommand === 'create') {
            await this.handleRoleCreate(message, args.slice(1));
        }
    },

    async handleRoleCreate(message, args) {
        const member = message.member;
        const guild = message.guild;

        // Check permissions
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No tienes permiso para gestionar roles`);
            return message.reply({ embeds: [embed] });
        }

        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Uso: \`.role create <nombre> [color hex]\`\n\nEjemplo: \`.role create VIP #FF5733\``);
            return message.reply({ embeds: [embed] });
        }

        // Parse arguments - last arg might be a color
        let roleName = args.join(' ');
        let roleColor = null;

        // Check if last argument is a hex color
        const lastArg = args[args.length - 1];
        if (/^#?[0-9A-Fa-f]{6}$/.test(lastArg)) {
            roleColor = lastArg.startsWith('#') ? lastArg : `#${lastArg}`;
            roleName = args.slice(0, -1).join(' ');
        }

        if (!roleName.trim()) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Debes proporcionar un nombre para el rol`);
            return message.reply({ embeds: [embed] });
        }

        try {
            const newRole = await guild.roles.create({
                name: roleName,
                color: roleColor || '#99AAB5',
                reason: `Creado por ${message.author.tag}`
            });

            const embed = new EmbedBuilder()
                .setColor(roleColor || '#00FF00')
                .setTitle(`${DISCO_ICONS.SUCCESS} Rol Creado`)
                .setDescription(`${DISCO_ICONS.POINT} **Nombre:** ${newRole}\n${DISCO_ICONS.POINT} **ID:** \`${newRole.id}\`\n${DISCO_ICONS.POINT} **Color:** \`${newRole.hexColor}\``);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Role Create] Error:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error al crear el rol: ${error.message}`);
            return message.reply({ embeds: [embed] });
        }
    },

    async handleRoleAdd(source, userArg = null, roleArg = null) {
        const isInteraction = !!source.deferReply;
        const member = source.member;
        const guild = source.guild;

        // Get user and role
        const targetMember = userArg || (isInteraction ? await guild.members.fetch(source.options.getUser('usuario').id) : null);
        const role = roleArg || (isInteraction ? source.options.getRole('rol') : null);

        // Check permissions
        const executorId = source.user?.id || source.author?.id;
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(executorId);
        if (!isOwner && !member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No tienes permiso para gestionar roles`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check role hierarchy - can't give roles higher than your highest role (bot owners bypass)
        const memberHighestRole = member.roles.highest;
        if (!isOwner && role.position >= memberHighestRole.position && member.id !== guild.ownerId) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedes asignar un rol igual o superior al tuyo`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check if bot can manage this role
        const botMember = guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedo asignar un rol superior al mío`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check if user already has the role
        if (targetMember.roles.cache.has(role.id)) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} ${targetMember} ya tiene el rol ${role}`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        try {
            await targetMember.roles.add(role);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`${DISCO_ICONS.SUCCESS} Se añadió el rol ${role} a ${targetMember}`);
            return isInteraction ? source.reply({ embeds: [embed] }) : source.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Role Add] Error:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error al añadir el rol: ${error.message}`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }
    },

    async handleRoleRemove(source, userArg = null, roleArg = null) {
        const isInteraction = !!source.deferReply;
        const member = source.member;
        const guild = source.guild;

        const targetMember = userArg || (isInteraction ? await guild.members.fetch(source.options.getUser('usuario').id) : null);
        const role = roleArg || (isInteraction ? source.options.getRole('rol') : null);

        // Check permissions
        const executorId = source.user?.id || source.author?.id;
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(executorId);
        if (!isOwner && !member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No tienes permiso para gestionar roles`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check role hierarchy (bot owners bypass)
        const memberHighestRole = member.roles.highest;
        if (!isOwner && role.position >= memberHighestRole.position && member.id !== guild.ownerId) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedes quitar un rol igual o superior al tuyo`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check bot hierarchy
        const botMember = guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedo quitar un rol superior al mío`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check if user has the role
        if (!targetMember.roles.cache.has(role.id)) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} ${targetMember} no tiene el rol ${role}`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        try {
            await targetMember.roles.remove(role);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`${DISCO_ICONS.SUCCESS} Se quitó el rol ${role} de ${targetMember}`);
            return isInteraction ? source.reply({ embeds: [embed] }) : source.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Role Remove] Error:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} Error al quitar el rol: ${error.message}`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }
    },

    async handleRoleAll(source, roleArg = null) {
        const isInteraction = !!source.deferReply;
        const member = source.member;
        const guild = source.guild;

        const role = roleArg || (isInteraction ? source.options.getRole('rol') : null);

        // Check permissions
        const executorId = source.user?.id || source.author?.id;
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(executorId);
        if (!isOwner && !member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No tienes permiso para gestionar roles`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check role hierarchy (bot owners bypass)
        const memberHighestRole = member.roles.highest;
        if (!isOwner && role.position >= memberHighestRole.position && member.id !== guild.ownerId) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedes asignar un rol igual o superior al tuyo a todos`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Check bot hierarchy
        const botMember = guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`${DISCO_ICONS.ERROR} No puedo asignar un rol superior al mío`);
            return isInteraction ? source.reply({ embeds: [embed], ephemeral: true }) : source.reply({ embeds: [embed] });
        }

        // Defer reply for long operation
        if (isInteraction) await source.deferReply();

        // Fetch all members
        await guild.members.fetch();
        const membersWithoutRole = guild.members.cache.filter(m => !m.roles.cache.has(role.id) && !m.user.bot);
        const totalMembers = membersWithoutRole.size;

        if (totalMembers === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} Todos los miembros ya tienen el rol ${role}`);
            return isInteraction ? source.editReply({ embeds: [embed] }) : source.reply({ embeds: [embed] });
        }

        // Calculate ETA (approximately 1 second per member to avoid rate limits)
        const etaSeconds = totalMembers;
        const etaMinutes = Math.ceil(etaSeconds / 60);
        const etaDisplay = etaSeconds < 60 ? `${etaSeconds} segundos` : `~${etaMinutes} minutos`;

        // Send initial message
        const startEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${DISCO_ICONS.LOADING} Añadiendo rol a todos...`)
            .setDescription(`Añadiendo ${role} a **${totalMembers}** miembros`)
            .addFields(
                { name: `${DISCO_ICONS.POINT} ETA`, value: etaDisplay, inline: true },
                { name: `${DISCO_ICONS.POINT} Progreso`, value: `0/${totalMembers}`, inline: true }
            );

        const statusMsg = isInteraction
            ? await source.editReply({ embeds: [startEmbed] })
            : await source.reply({ embeds: [startEmbed] });

        // Process members
        let success = 0;
        let failed = 0;
        let processed = 0;

        for (const [, targetMember] of membersWithoutRole) {
            try {
                await targetMember.roles.add(role);
                success++;
            } catch {
                failed++;
            }
            processed++;

            // Update progress every 10 members or at the end
            if (processed % 10 === 0 || processed === totalMembers) {
                const progressEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`${DISCO_ICONS.LOADING} Añadiendo rol a todos...`)
                    .setDescription(`Añadiendo ${role} a **${totalMembers}** miembros`)
                    .addFields(
                        { name: `${DISCO_ICONS.POINT} Progreso`, value: `${processed}/${totalMembers}`, inline: true },
                        { name: `${DISCO_ICONS.SUCCESS} Exitosos`, value: `${success}`, inline: true },
                        { name: `${DISCO_ICONS.ERROR} Fallidos`, value: `${failed}`, inline: true }
                    );

                await statusMsg.edit({ embeds: [progressEmbed] }).catch(() => { });
            }

            // Rate limit protection - wait 1 second between each role add
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Final message
        const finalEmbed = new EmbedBuilder()
            .setColor(failed === 0 ? '#00FF00' : '#FFA500')
            .setTitle(`${DISCO_ICONS.SUCCESS} Rol añadido a todos`)
            .setDescription(`Se completó la asignación del rol ${role}`)
            .addFields(
                { name: `${DISCO_ICONS.SUCCESS} Exitosos`, value: `${success}`, inline: true },
                { name: `${DISCO_ICONS.ERROR} Fallidos`, value: `${failed}`, inline: true },
                { name: `${DISCO_ICONS.POINT} Total`, value: `${totalMembers}`, inline: true }
            );

        await statusMsg.edit({ embeds: [finalEmbed] });
    }
};
