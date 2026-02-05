const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const { DISCO_ICONS } = require('../../utils/icons');
const { createErrorEmbed } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcmd')
        .setDescription('Crear un comando personalizado con panel interactivo')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del comando (sin espacios)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const nombre = interaction.options.getString('nombre').toLowerCase().replace(/\s/g, '');
        await this.showPanel(interaction, nombre);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return this.replyError(message, 'No tienes permiso para crear comandos.');
        }

        if (args.length < 1) {
            const prefix = await getPrefix(message.guild.id);
            const embed = new EmbedBuilder()
                .setDescription(
                    `${DISCO_ICONS.INFO} **Crear Comando Personalizado**\n\n` +
                    `> **Uso:** \`${prefix}addcmd <nombre>\`\n` +
                    `> **Ejemplo:** \`${prefix}addcmd precios\`\n\n` +
                    `${DISCO_ICONS.POINT} Se abrirá un panel interactivo para configurar`
                )
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const nombre = args[0].toLowerCase();

        // Validate command name
        if (!/^[a-z0-9_-]+$/.test(nombre)) {
            const embed = createErrorEmbed('El nombre solo puede contener letras, números, guiones y guiones bajos.');
            return message.reply({ embeds: [embed] });
        }

        // Check if exists
        const existing = await CustomCommand.findOne({ guildId: message.guild.id, name: nombre });
        if (existing) {
            const embed = createErrorEmbed(`El comando \`${nombre}\` ya existe.`);
            return message.reply({ embeds: [embed] });
        }

        // Create initial entry in DB
        const newCmd = new CustomCommand({
            guildId: message.guild.id,
            name: nombre,
            embedDescription: '꒷꒦ ﹒ Configura tu comando ﹒ ꒷꒦',
            embedColor: 0x2B2D31,
            createdBy: message.author.id
        });
        await newCmd.save();

        await this.showPanelMessage(message, nombre);
    },

    async showPanel(interaction, nombre) {
        // Validate
        if (!/^[a-z0-9_-]+$/.test(nombre)) {
            const embed = createErrorEmbed('El nombre solo puede contener letras, números, guiones y guiones bajos.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if exists
        const existing = await CustomCommand.findOne({ guildId: interaction.guild.id, name: nombre });
        if (existing) {
            const embed = createErrorEmbed(`El comando \`${nombre}\` ya existe. Usa \`/editcmd\` para modificarlo.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Create initial entry
        const newCmd = new CustomCommand({
            guildId: interaction.guild.id,
            name: nombre,
            embedDescription: '꒷꒦ ﹒ Configura tu comando ﹒ ꒷꒦',
            embedColor: 0x2B2D31,
            createdBy: interaction.user.id
        });
        await newCmd.save();

        const { embed, components } = await this.buildPanel(interaction.guild.id, nombre);
        await interaction.reply({ embeds: [embed], components, ephemeral: true });
    },

    async showPanelMessage(message, nombre) {
        const { embed, components } = await this.buildPanel(message.guild.id, nombre);
        await message.reply({ embeds: [embed], components });
    },

    async buildPanel(guildId, cmdName) {
        const cmd = await CustomCommand.findOne({ guildId, name: cmdName });
        const prefix = await getPrefix(guildId);

        // Preview embed
        const previewEmbed = new EmbedBuilder()
            .setDescription(cmd.embedDescription)
            .setColor(cmd.embedColor || 0x2B2D31);

        if (cmd.embedTitle) previewEmbed.setTitle(cmd.embedTitle);
        if (cmd.embedImage) previewEmbed.setImage(cmd.embedImage);
        if (cmd.embedThumbnail) previewEmbed.setThumbnail(cmd.embedThumbnail);
        if (cmd.embedFooter) previewEmbed.setFooter({ text: cmd.embedFooter });

        // Panel embed
        const panelEmbed = new EmbedBuilder()
            .setDescription(
                `${DISCO_ICONS.COMMAND} **Panel de Configuración**\n\n` +
                `${DISCO_ICONS.POINT} **Comando:** \`${prefix}${cmdName}\`\n` +
                `${DISCO_ICONS.POINT} **Estado:** Editando\n\n` +
                `✦ Usa los botones para personalizar tu comando ✦`
            )
            .setColor(0x2B2D31);

        // Buttons row 1
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cmd_title_${cmdName}`)
                .setLabel('Título')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cmd_desc_${cmdName}`)
                .setLabel('Descripción')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cmd_color_${cmdName}`)
                .setLabel('Color')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cmd_footer_${cmdName}`)
                .setLabel('Footer')
                .setEmoji('📎')
                .setStyle(ButtonStyle.Secondary)
        );

        // Buttons row 2
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cmd_image_${cmdName}`)
                .setLabel('Imagen')
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cmd_thumb_${cmdName}`)
                .setLabel('Thumbnail')
                .setEmoji('🔲')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cmd_save_${cmdName}`)
                .setLabel('Guardar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cmd_cancel_${cmdName}`)
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        return {
            embed: previewEmbed,
            components: [row1, row2]
        };
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};
