const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Clone and delete the current channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await this.handleNuke(interaction);
    },

    async messageRun(message, args) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.ManageChannels);

        // Check for staff role from database
        let hasStaffRole = false;
        try {
            const staffRoleDoc = await StaffRole.findOne({ guildId: message.guild.id });
            if (staffRoleDoc && message.member.roles.cache.has(staffRoleDoc.roleId)) {
                hasStaffRole = true;
            }
        } catch { }

        if (!isOwner && !hasPermission && !hasStaffRole) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> **Error:** No tienes permiso para usar este comando.')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        await this.handleNuke(message);
    },

    async handleNuke(source) {
        const channel = source.channel;
        if (!channel.deletable) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> **Error:** No puedo nukear este canal.')
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const verifyEmbed = new EmbedBuilder()
            .setTitle('<:warning:1448832070628671488> Confirmación')
            .setDescription('¿Estás seguro de que quieres nukear este canal?\nEsta acción no se puede deshacer.')
            .setColor(0xFEE75C);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nuke_yes')
                    .setLabel('Sí')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('nuke_no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Secondary)
            );

        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const response = await reply({ embeds: [verifyEmbed], components: [buttons], fetchReply: true });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== (source.user ? source.user.id : source.author.id)) {
                return i.reply({ content: 'Solo quien ejecutó el comando puede confirmar.', ephemeral: true });
            }

            if (i.customId === 'nuke_yes') {
                const position = channel.position;
                const newChannel = await channel.clone();
                await channel.delete();
                await newChannel.setPosition(position);

                const executor = source.user || source.author;
                const embed = new EmbedBuilder()
                    .setDescription(`<:checkmark:1448832045068583033> Canal nukeado por ${executor.tag}.`)
                    .setColor(0x2B2D31);

                await newChannel.send({ embeds: [embed] });
            } else {
                await i.update({ content: 'Nuke cancelado.', embeds: [], components: [] });
                setTimeout(() => response.delete().catch(() => { }), 3000);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                if (source.editReply) {
                    source.editReply({ content: 'Tiempo agotado.', embeds: [], components: [] });
                } else {
                    response.edit({ content: 'Tiempo agotado.', embeds: [], components: [] });
                }
                setTimeout(() => response.delete().catch(() => { }), 3000);
            }
        });
    }
};












