const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const { DISCO_ICONS } = require('../../utils/icons');
const { createErrorEmbed } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delcmd')
        .setDescription('Eliminar un comando personalizado')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del comando a eliminar')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const nombre = interaction.options.getString('nombre').toLowerCase();
        await this.handleDelCmd(interaction, nombre);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return this.replyError(message, 'No tienes permiso para eliminar comandos.');
        }

        if (args.length < 1) {
            const prefix = await getPrefix(message.guild.id);
            const embed = new EmbedBuilder()
                .setDescription(
                    `${DISCO_ICONS.INFO} **Eliminar Comando**\n\n` +
                    `> **Uso:** \`${prefix}delcmd <nombre>\`\n` +
                    `> **Ejemplo:** \`${prefix}delcmd precios\``
                )
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const nombre = args[0].toLowerCase();
        await this.handleDelCmd(message, nombre);
    },

    async handleDelCmd(source, nombre) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const result = await CustomCommand.findOneAndDelete({ guildId: source.guild.id, name: nombre });

            if (!result) {
                const embed = createErrorEmbed(`El comando \`${nombre}\` no existe.`);
                return reply({ embeds: [embed], ephemeral: true });
            }

            const successEmbed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CHECKMARK} Comando \`${nombre}\` eliminado exitosamente.`)
                .setColor(0x2B2D31);

            await reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('[DelCmd] Error:', error);
            const embed = createErrorEmbed('Error al eliminar el comando.');
            return reply({ embeds: [embed], ephemeral: true });
        }
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};
