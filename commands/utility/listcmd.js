const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listcmd')
        .setDescription('Ver lista de comandos personalizados del servidor'),

    async execute(interaction) {
        await this.handleListCmd(interaction);
    },

    async messageRun(message) {
        await this.handleListCmd(message);
    },

    async handleListCmd(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const commands = await CustomCommand.find({ guildId: source.guild.id }).sort({ name: 1 });
            const prefix = await getPrefix(source.guild.id);

            if (commands.length === 0) {
                const embed = new EmbedBuilder()
                    .setDescription(
                        `${DISCO_ICONS.INFO} **No hay comandos personalizados**\n\n` +
                        `${DISCO_ICONS.POINT} Usa \`${prefix}addcmd\` para crear uno`
                    )
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed], ephemeral: true });
            }

            const commandList = commands.map(cmd =>
                `${DISCO_ICONS.POINT} \`${prefix}${cmd.name}\``
            ).join('\n');

            const embed = new EmbedBuilder()
                .setDescription(
                    `${DISCO_ICONS.COMMAND} **Comandos Personalizados** (${commands.length})\n\n` +
                    commandList
                )
                .setColor(0x2B2D31)
                .setFooter({ text: `Usa ${prefix}delcmd <nombre> para eliminar` });

            await reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('[ListCmd] Error:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} Error al obtener la lista de comandos.`)
                .setColor(0x2B2D31);
            return reply({ embeds: [embed], ephemeral: true });
        }
    }
};
