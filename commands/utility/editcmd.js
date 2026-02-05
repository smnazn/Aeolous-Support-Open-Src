const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const { DISCO_ICONS } = require('../../utils/icons');
const { createErrorEmbed } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editcmd')
        .setDescription('Editar un comando personalizado existente')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del comando a editar')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const nombre = interaction.options.getString('nombre').toLowerCase();
        await this.handleEditCmd(interaction, nombre);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return this.replyError(message, 'No tienes permiso para editar comandos.');
        }

        if (args.length < 1) {
            const prefix = await getPrefix(message.guild.id);
            const embed = new EmbedBuilder()
                .setDescription(
                    `${DISCO_ICONS.INFO} **Editar Comando**\n\n` +
                    `> **Uso:** \`${prefix}editcmd <nombre>\`\n` +
                    `> **Ejemplo:** \`${prefix}editcmd precios\``
                )
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const nombre = args[0].toLowerCase();
        await this.handleEditCmd(message, nombre);
    },

    async handleEditCmd(source, nombre) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const guildId = source.guild.id;

        // Check if command exists
        const cmd = await CustomCommand.findOne({ guildId, name: nombre });
        if (!cmd) {
            const embed = createErrorEmbed(`El comando \`${nombre}\` no existe.`);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const { embed, components } = await this.buildPanel(guildId, nombre);
        await reply({ embeds: [embed], components, ephemeral: true });
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
                .setCustomId(`cmd_done_${cmdName}`)
                .setLabel('Listo')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cmd_delete_${cmdName}`)
                .setLabel('Eliminar')
                .setEmoji('🗑️')
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
