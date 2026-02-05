const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ReactionRole = require('../../models/ReactionRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactroles')
        .setDescription('Gestiona los roles por reacción')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade un rol por reacción a un mensaje')
                .addStringOption(option =>
                    option.setName('mensaje_id')
                        .setDescription('ID del mensaje')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji a reaccionar')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Rol a entregar')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal donde está el mensaje (opcional)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina un rol por reacción')
                .addStringOption(option =>
                    option.setName('mensaje_id')
                        .setDescription('ID del mensaje')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji a eliminar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista los roles por reacción activos')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'add') {
                const messageId = interaction.options.getString('mensaje_id');
                const emoji = interaction.options.getString('emoji');
                const role = interaction.options.getRole('rol');
                const channel = interaction.options.getChannel('canal') || interaction.channel;

                // Verify message exists
                try {
                    const message = await channel.messages.fetch(messageId);
                    await message.react(emoji);
                } catch (error) {
                    return interaction.reply({ content: '❌ No se pudo encontrar el mensaje o reaccionar con ese emoji. Verifica el ID y que el bot tenga acceso.', ephemeral: true });
                }

                // Save to DB
                const existing = await ReactionRole.findOne({ messageId, emoji });
                if (existing) {
                    existing.roleId = role.id;
                    existing.channelId = channel.id;
                    await existing.save();
                    await interaction.reply({ content: `✅ Actualizado: Reaccionar con ${emoji} en ese mensaje ahora dará el rol ${role}.`, ephemeral: true });
                } else {
                    const newRR = new ReactionRole({
                        guildId,
                        messageId,
                        channelId: channel.id,
                        emoji,
                        roleId: role.id
                    });
                    await newRR.save();
                    await interaction.reply({ content: `✅ Configurado: Reaccionar con ${emoji} en ese mensaje dará el rol ${role}.`, ephemeral: true });
                }

            } else if (subcommand === 'remove') {
                const messageId = interaction.options.getString('mensaje_id');
                const emoji = interaction.options.getString('emoji');

                const result = await ReactionRole.deleteOne({ messageId, emoji });

                if (result.deletedCount > 0) {
                    await interaction.reply({ content: `✅ Se ha eliminado la configuración para el emoji ${emoji} en el mensaje ${messageId}.`, ephemeral: true });
                    // Optional: Remove bot's reaction
                } else {
                    await interaction.reply({ content: '❌ No se encontró esa configuración de reaction role.', ephemeral: true });
                }

            } else if (subcommand === 'list') {
                const roles = await ReactionRole.find({ guildId });

                if (roles.length === 0) {
                    return interaction.reply({ content: 'ℹ️ No hay reaction roles configurados.', ephemeral: true });
                }

                const description = roles.map((rr, i) => {
                    return `**${i + 1}.** Mensaje: [Link](https://discord.com/channels/${guildId}/${rr.channelId}/${rr.messageId}) | Emoji: ${rr.emoji} | Rol: <@&${rr.roleId}>`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🎭 Reaction Roles Activos')
                    .setDescription(description)
                    .setColor(0x2B2D31);

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Error al ejecutar el comando.', ephemeral: true });
        }
    },
};











