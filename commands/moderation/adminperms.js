const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminperms')
        .setDescription('Muestra miembros con permisos peligrosos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Solo administradores pueden usar esto.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            const dangerBits = new Map([
                ['Administrador', PermissionFlagsBits.Administrator],
                ['Gestionar Servidor', PermissionFlagsBits.ManageGuild],
                ['Gestionar Roles', PermissionFlagsBits.ManageRoles],
                ['Gestionar Canales', PermissionFlagsBits.ManageChannels],
                ['Banear Miembros', PermissionFlagsBits.BanMembers],
                ['Expulsar Miembros', PermissionFlagsBits.KickMembers],
                ['Gestionar Webhooks', PermissionFlagsBits.ManageWebhooks],
            ]);

            const adminUsers = [];
            const dangerUsers = new Map();

            for (const member of members.values()) {
                if (member.user.bot) continue;
                if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                    adminUsers.push(member);
                    continue;
                }
                const perms = [];
                for (const [label, bit] of dangerBits) {
                    if (member.permissions.has(bit)) perms.push(label);
                }
                if (perms.length) dangerUsers.set(member, perms);
            }

            const embed = new EmbedBuilder()
                .setTitle('Permisos peligrosos en el servidor')
                .setColor(0xff0000);

            embed.addFields({
                name: 'Permiso Administrador',
                value: adminUsers.length ? adminUsers.map(m => `<@${m.id}>`).join('\n') : 'Ninguno',
                inline: false,
            });

            if (dangerUsers.size) {
                const lines = [];
                for (const [member, perms] of dangerUsers) {
                    lines.push(`${member} - ${perms.join(', ')}`);
                }
                embed.addFields({
                    name: 'Otros permisos peligrosos',
                    value: lines.join('\n').substring(0, 1024),
                    inline: false,
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },

    async messageRun(message) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: 'Solo administradores pueden usar esto.' });
        }

        try {
            const members = await message.guild.members.fetch();
            const dangerBits = new Map([
                ['Administrador', PermissionFlagsBits.Administrator],
                ['Gestionar Servidor', PermissionFlagsBits.ManageGuild],
                ['Gestionar Roles', PermissionFlagsBits.ManageRoles],
                ['Gestionar Canales', PermissionFlagsBits.ManageChannels],
                ['Banear Miembros', PermissionFlagsBits.BanMembers],
                ['Expulsar Miembros', PermissionFlagsBits.KickMembers],
                ['Gestionar Webhooks', PermissionFlagsBits.ManageWebhooks],
            ]);

            const adminUsers = [];
            const dangerUsers = new Map();

            for (const member of members.values()) {
                if (member.user.bot) continue;
                if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                    adminUsers.push(member);
                    continue;
                }
                const perms = [];
                for (const [label, bit] of dangerBits) {
                    if (member.permissions.has(bit)) perms.push(label);
                }
                if (perms.length) dangerUsers.set(member, perms);
            }

            const embed = new EmbedBuilder()
                .setTitle('Permisos peligrosos en el servidor')
                .setColor(0xff0000);

            embed.addFields({
                name: 'Permiso Administrador',
                value: adminUsers.length ? adminUsers.map(m => `<@${m.id}>`).join('\n') : 'Ninguno',
                inline: false,
            });

            if (dangerUsers.size) {
                const lines = [];
                for (const [member, perms] of dangerUsers) {
                    lines.push(`${member} - ${perms.join(', ')}`);
                }
                embed.addFields({
                    name: 'Otros permisos peligrosos',
                    value: lines.join('\n').substring(0, 1024),
                    inline: false,
                });
            }

            await message.reply({ embeds: [embed] });
        } catch (err) {
            await message.reply(`Error: ${err.message}`);
        }
    },
};











